import pandas as pd
import json

prod_df = pd.read_excel(r'c:\Users\arpan\OneDrive\Documents\code\Unstop\_h_batch_production_data.xlsx')
proc_df = pd.read_excel(r'c:\Users\arpan\OneDrive\Documents\code\Unstop\_h_batch_process_data.xlsx', sheet_name='Batch_T001')

with open(r'c:\Users\arpan\OneDrive\Documents\code\Unstop\brain\cols.json', 'w') as f:
    json.dump({"prod": prod_df.columns.tolist(), "proc": proc_df.columns.tolist()}, f, indent=2)
