from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import duckdb
import anthropic
import pandas as pd
import io
import os
import yaml
import json
from compiler import auto_generate_model, run_explore

load_dotenv()

app = FastAPI(title="Mirai BI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"""You are a data analyst assistant for Mirai BI.
                
Here is a preview of the dataset:
{data_preview}

User question: {question}

Provide a concise, insightful analysis. Highlight trends, anomalies, or key takeaways."""
            }
        ]
    )

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
    model_yaml: str = "",
    selected_fields: str = "[]",
    filters: str = "[]",
    calculations: str = "[]"
):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    if not model_yaml:
        model = auto_generate_model(df)
        model_yaml = yaml.dump(model, default_flow_style=False)

    selected = json.loads(selected_fields)
    filter_list = json.loads(filters)
    calc_list = json.loads(calculations)

    result = run_explore(df, model_yaml, selected, filter_list, calc_list)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
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

