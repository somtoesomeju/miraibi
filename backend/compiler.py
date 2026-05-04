import duckdb
import pandas as pd
import yaml
from typing import Any

def auto_generate_model(df: pd.DataFrame, name: str = "dataset") -> dict:
    model = {
        "model": name,
        "dimensions": [],
        "measures": [],
        "calculations": []
    }
    for col in df.columns:
        if df[col].dtype == "object":
            model["dimensions"].append({
                "name": col,
                "type": "string",
                "field": col
            })
        elif "date" in col.lower() or "month" in col.lower():
            model["dimensions"].append({
                "name": col,
                "type": "date",
                "field": col
            })
        else:
            model["measures"].append({
                "name": col,
                "type": "number",
                "field": col,
                "aggregation": "sum"
            })
    return model

def compile_query(model: dict, selected_fields: list, filters: list, calculations: list) -> str:
    select_parts = []
    group_by_fields = []
    dimension_names = {d["name"]: d["field"] for d in model.get("dimensions", [])}
    measure_names = {m["name"]: m for m in model.get("measures", [])}

    for field in selected_fields:
        if field in dimension_names:
            col = dimension_names[field]
            select_parts.append(f'"{col}" AS "{field}"')
            group_by_fields.append(f'"{col}"')
        elif field in measure_names:
            m = measure_names[field]
            agg = m.get("aggregation", "sum").upper()
            col = m["field"]
            select_parts.append(f'{agg}("{col}") AS "{field}"')

    for calc in calculations:
        if calc.get("name") and calc.get("expression"):
            select_parts.append(f'{calc["expression"]} AS "{calc["name"]}"')

    if not select_parts:
        return "SELECT * FROM dataset LIMIT 100"

    where_parts = []
    for f in filters:
        if f.get("field") and f.get("operator") and f.get("value") is not None:
            field = f["field"]
            op = f["operator"]
            val = f["value"]
            if op == "equals":
                where_parts.append(f'"{field}" = \'{val}\'')
            elif op == "not_equals":
                where_parts.append(f'"{field}" != \'{val}\'')
            elif op == "greater_than":
                where_parts.append(f'"{field}" > {val}')
            elif op == "less_than":
                where_parts.append(f'"{field}" < {val}')
            elif op == "contains":
                where_parts.append(f'"{field}" LIKE \'%{val}%\'')

    sql = f"SELECT {', '.join(select_parts)} FROM dataset"
    if where_parts:
        sql += f" WHERE {' AND '.join(where_parts)}"
    if group_by_fields:
        sql += f" GROUP BY {', '.join(group_by_fields)}"
    sql += " LIMIT 500"

    return sql

def run_explore(df: pd.DataFrame, model_yaml: str, selected_fields: list, filters: list, calculations: list) -> pd.DataFrame:
    model = yaml.safe_load(model_yaml)
    sql = compile_query(model, selected_fields, filters, calculations)
    con = duckdb.connect()
    con.register("dataset", df)
    return con.execute(sql).df()