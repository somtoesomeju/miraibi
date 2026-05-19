from fastapi import FastAPI, UploadFile, File, Request, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import duckdb
import anthropic
import pandas as pd
import io
import os
import yaml
import json
from compiler import auto_generate_model, compile_query, run_explore

load_dotenv()

app = FastAPI(title="Mirai BI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        response = JSONResponse(content={})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.get("/health")
def health():
    return {"status": "ok", "app": "Mirai BI"}

@app.post("/query")
async def query_csv(file: UploadFile = File(...), question: str = "Give me a summary of this data"):
    # Load CSV into DuckDB
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    con = duckdb.connect()
    con.register("dataset", df)

    # Run a summary query
    result = con.execute("SELECT * FROM dataset LIMIT 50").df()
    data_preview = result.to_string(index=False)

    # Send to Claude for insight
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[
    {
        "role": "user",
        "content": f"""You are a data analyst for Mirai BI. Analyze this data and respond in clean markdown.

Data:
{data_preview}

Question: {question}

Format your response EXACTLY like this:

## Summary
One sentence summary of the key finding.

## Key Highlights
- **[Metric]**: [insight]
- **[Metric]**: [insight]
- **[Metric]**: [insight]

## Trends
Brief paragraph about trends, using **bold** for important numbers and platform names.

## Recommendation
One actionable recommendation in bold.

Rules:
- Use **bold** for all numbers, platform names, and key metrics
- Keep each bullet point to one line
- Maximum 4 bullet points in Key Highlights
- Be specific with numbers from the data
- Never use generic AI phrases like "it's worth noting" or "in conclusion\""""
    }
])
    return {
        "insight": message.content[0].text,
        "rows": len(df),
        "columns": list(df.columns)
    }
@app.post("/explore/model")
async def generate_model(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    model = auto_generate_model(df)
    return {
        "model": model,
        "yaml": yaml.dump(model, default_flow_style=False),
        "columns": list(df.columns)
    }

@app.post("/explore/query")
async def explore_query(
    file: UploadFile = File(...),
    model_yaml: str = Form(""),
    selected_fields: str = Form("[]"),
    filters: str = Form("[]"),
    calculations: str = Form("[]")
):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    if not model_yaml:
        model = auto_generate_model(df)
        model_yaml = yaml.dump(model, default_flow_style=False)

    selected = json.loads(selected_fields)
    filter_list = json.loads(filters)
    calc_list = json.loads(calculations)

    from compiler import compile_query
    import yaml as _yaml
    _model = _yaml.safe_load(model_yaml)
    _sql = compile_query(_model, selected, filter_list, calc_list)
    print(f"DEBUG SQL: {_sql}")
    print(f"DEBUG selected: {selected}")
    result = run_explore(df, model_yaml, selected, filter_list, calc_list)
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"""You are a data analyst for Mirai BI.
Data preview:
{result.to_string(index=False)}

Selected fields: {selected}
Active filters: {filter_list}
Custom calculations: {calc_list}

Provide a concise insight about what this explore reveals."""
        }]
    )

    return {
        "data": result.to_dict(orient="records"),
        "columns": list(result.columns),
        "rows": len(result),
        "sql": "",
        "insight": message.content[0].text,
        "model_yaml": model_yaml
    }

@app.post("/explore/chat")
async def explore_chat(
    file: UploadFile = File(...),
    model_yaml: str = Form(""),
    selected_fields: str = Form("[]"),
    filters: str = Form("[]"),
    calculations: str = Form("[]"),
    messages: str = Form("[]"),
    user_message: str = Form(""),
    context: str = Form("dashboard")
):
    print(f"DEBUG user_message: '{user_message}'")  # add this line
    print(f"DEBUG messages: '{messages}'")           # add this line
    
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    if not model_yaml:
        model = auto_generate_model(df)
        model_yaml = yaml.dump(model, default_flow_style=False)

    selected = json.loads(selected_fields)
    filter_list = json.loads(filters)
    calc_list = json.loads(calculations)
    history = json.loads(messages)

    result = run_explore(df, model_yaml, selected, filter_list, calc_list)
    data_preview = result.head(20).to_string(index=False)

    is_explore = context == "explore"

    if is_explore:
        system_prompt = f"""You are Mirai AI, a data analyst assistant inside Mirai BI's Explore page.

CRITICAL RULES:
1. You MUST always end your response with a <query_update> block when the user asks about data, charts, trends, or metrics
2. NEVER tell the user to "go to" or "click on" anything - you ARE the interface
3. Keep text responses to 2-3 sentences maximum
4. Always be direct and confident

Available fields in this dataset:
- Dimensions (use for grouping/x-axis): {[d['name'] for d in yaml.safe_load(model_yaml).get('dimensions', [])]}
- Measures (use for values/y-axis): {[m['name'] for m in yaml.safe_load(model_yaml).get('measures', [])]}

Current data preview:
{result.head(10).to_string(index=False)}

ALWAYS append this block at the end of your response when showing data:
<query_update>
{{"selected_fields": ["dimension", "measure1", "measure2"], "filters": []}}
</query_update>

Rules for selected_fields:
- Always include at least one dimension AND one measure
- Use EXACT field names from the lists above
- For time trends use "month" as dimension
- For platform comparisons use "platform" as dimension
- filters format: [{{"field": "x", "operator": "greater_than", "value": "y"}}]
- operators ONLY: equals, not_equals, greater_than, less_than, contains
- For date ranges use greater_than and less_than with values like "2024-10"

Example - if user asks "show me revenue by platform":
Selected fields should be: ["platform", "revenue_attributed"]

Example - if user asks "show monthly impressions and clicks":
Selected fields should be: ["month", "impressions", "clicks"]"""
    else:
        system_prompt = f"""You are Mirai AI, a data analyst assistant inside Mirai BI.

CRITICAL RULES:
1. You are a READ-ONLY analyst on this page. You CANNOT modify the dashboard or create widgets.
2. If asked to "build" or "create" a chart, politely explain that chart-building is only available on the Explore page or via the Build from Scratch builder. Suggest the user go there.
3. Otherwise, answer questions about the data with insight: trends, anomalies, top items, comparisons.
4. Use markdown formatting: **bold** for numbers, ## for sections.
5. Keep responses focused — 3-5 sentences for simple questions, structured markdown for analysis.

Available fields in this dataset:
- Dimensions: {[d['name'] for d in yaml.safe_load(model_yaml).get('dimensions', [])]}
- Measures: {[m['name'] for m in yaml.safe_load(model_yaml).get('measures', [])]}

Current data preview:
{result.head(10).to_string(index=False)}

NEVER include a <query_update> block in your responses on this page."""

    chat_messages = []
    for msg in history:
        chat_messages.append({"role": msg["role"], "content": msg["content"]})
    chat_messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=system_prompt,
        messages=chat_messages
    )

    reply = response.content[0].text

    new_filters = None
    new_fields = None

    if "<query_update>" in reply:
        try:
            start = reply.index("<query_update>") + len("<query_update>")
            end = reply.index("</query_update>")
            update_json = reply[start:end].strip()
            update_json = update_json.replace('\n', '').replace('  ', ' ')
            parsed = json.loads(update_json)
            new_filters = parsed.get("filters")
            new_fields = parsed.get("selected_fields")
            reply = reply[:reply.index("<query_update>")].strip()
            print(f"DEBUG parsed fields: {new_fields}, filters: {new_filters}")
        except Exception as e:
            print(f"DEBUG parse error: {e}")

    return {
        "reply": reply,
        "new_filters": new_filters,
        "new_fields": new_fields
    }
    # force redeploy Mon May  4 21:20:27 UTC 2026
