from sqlalchemy import inspect
from database import engine

def inspect_database():
    inspector = inspect(engine)

    for table_name in inspector.get_table_names():
        print(f"\n{'=' * 50}")
        print(f"TABLE: {table_name}")
        print("=" * 50)

        #Thong tin cac cot
        columns = inspect.get_columns(table_name)

        for column in columns:
            print(
                f"Column: {column['name']:<25}"
                f"Type: {str(column['type']):<15}"
                f"Nullable: {column['nullable']}"
                f"Primary Key: {column.get('primary_key', False)}"
            )
        #Thong tin khoa ngoai
        foreign_keys = inspect.get_foreign_keys(table_name)