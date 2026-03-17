import pandas as pd
import json

proc_path = r"c:\Users\arpan\OneDrive\Documents\code\Unstop\_h_batch_process_data.xlsx"
proc_sheets = pd.read_excel(proc_path, sheet_name=None)

# check the batch sheets (not Summary)
batch_sheets = {k: v for k, v in proc_sheets.items() if k.startswith('Batch_')}
print(f"Batch sheets: {len(batch_sheets)}")

first_name = list(batch_sheets.keys())[0]
first_df = batch_sheets[first_name]
print(f"\n--- {first_name} columns ---")
for c in first_df.columns:
    print(f"  '{c}' (dtype={first_df[c].dtype})")

print(f"\n--- Phases in {first_name} ---")
if 'Phase' in first_df.columns:
    print(sorted(first_df['Phase'].unique().tolist()))
else:
    print("NO 'Phase' column!")
    for c in first_df.columns:
        if 'phase' in c.lower():
            print(f"  Found: '{c}' with values: {sorted(first_df[c].unique().tolist())}")

# Check for negative power in all sheets
print("\n--- Negative Power Check ---")
for sname, sdf in batch_sheets.items():
    pow_col = None
    for c in sdf.columns:
        if 'power' in c.lower():
            pow_col = c
            break
    if pow_col:
        neg = (sdf[pow_col] < 0).sum()
        if neg > 0:
            print(f"  {sname}: {neg} negative rows in '{pow_col}'")

# Summary sheet analysis
print("\n--- Summary Sheet ---")
summary = proc_sheets.get('Summary')
if summary is not None:
    print(f"Columns: {summary.columns.tolist()}")
    print(f"Rows: {len(summary)}")
    print(summary.head(3).to_string())
