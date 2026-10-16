import psycopg2

try:
    conn = psycopg2.connect(host="localhost", port=5432, user="postgres", password="password", dbname="postgres", connect_timeout=2)
except Exception as e:
    print("Postgres error message:", e)
