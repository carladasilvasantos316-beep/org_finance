import sqlite3

conn = sqlite3.connect("dados.db")

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE gastos (
id INTEGER PRIMARY KEY AUTOINCREMENT,
descricao TEXT,
valor REAL
)
""")

conn.commit()
conn.close()

print("Banco criado com sucesso!")