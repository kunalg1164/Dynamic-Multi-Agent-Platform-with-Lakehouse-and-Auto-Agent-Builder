from typing import Optional, Dict, Any
from ..services.duckdb_analytics import DuckDBAnalytics

class NLQToSQLService:
    def __init__(self, analytics: DuckDBAnalytics):
        self.analytics = analytics

    def generate_sql(self, query: str, table_name: Optional[str] = None) -> str:
        """
        Stub: Convert natural language query to SQL.
        For now, return a simple example SQL.
        Later, integrate with LLM for actual NLQ-to-SQL.
        """
        if "top 5 gainers" in query.lower():
            return "SELECT symbol, close_price FROM stock_prices ORDER BY close_price DESC LIMIT 5"
        elif "monthly revenue" in query.lower():
            return "SELECT date, SUM(close_price) as revenue FROM stock_prices GROUP BY date ORDER BY date"
        else:
            # Fallback to a simple query
            return f"SELECT * FROM {table_name or 'stock_prices'} LIMIT 10"

    def execute_nlq(self, query: str, table_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Process natural language query: generate SQL, execute, and explain.
        """
        sql = self.generate_sql(query, table_name)
        try:
            results = self.analytics.execute_query(sql)
            explanation = f"Executed SQL: {sql}. Found {len(results)} results."
            return {
                "query": query,
                "sql": sql,
                "results": results,
                "explanation": explanation
            }
        except Exception as e:
            return {
                "query": query,
                "sql": sql,
                "error": str(e),
                "results": []
            }