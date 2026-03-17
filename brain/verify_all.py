"""
Comprehensive 7-Stage Verification Script for the Python Brain.
Checks every assumption, every calculation, every output file.
"""
import pandas as pd
import numpy as np
import json
import os
import sys
import io

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

base_dir = r"c:\Users\arpan\OneDrive\Documents\code\Unstop"
brain_dir = os.path.join(base_dir, "brain")
prod_path = os.path.join(base_dir, "_h_batch_production_data.xlsx")
proc_path = os.path.join(base_dir, "_h_batch_process_data.xlsx")

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
errors = []
warnings = []

def check(condition, label, critical=True):
    if condition:
        print(f"  {PASS}: {label}")
    else:
        print(f"  {FAIL}: {label}")
        if critical:
            errors.append(label)
        else:
            warnings.append(label)

def warn_check(condition, label):
    if condition:
        print(f"  {PASS}: {label}")
    else:
        print(f"  {WARN}: {label}")
        warnings.append(label)

# ═══════════════════════════════════════════════════════════════
print("=" * 70)
print("STAGE 1 — RAW DATA CHECKS")
print("=" * 70)

prod_df = pd.read_excel(prod_path)
proc_sheets_raw = pd.read_excel(proc_path, sheet_name=None)
# Filter out the Summary sheet — only keep Batch_ sheets
proc_sheets = {k: v for k, v in proc_sheets_raw.items() if k.startswith('Batch_')}

print("\n[Production File]")
check(len(prod_df) == 60, f"Exactly 60 rows loaded (got {len(prod_df)})")
check(prod_df['Batch_ID'].nunique() == len(prod_df), f"No duplicate Batch IDs ({prod_df['Batch_ID'].nunique()} unique out of {len(prod_df)})")

null_cols = prod_df.columns[prod_df.isnull().all()].tolist()
check(len(null_cols) == 0, f"No column has all null values (all-null cols: {null_cols})")

h_min, h_max = prod_df['Hardness'].min(), prod_df['Hardness'].max()
check(40 <= h_min and h_max <= 140, f"Hardness range is Newtons [{h_min:.1f} - {h_max:.1f}] (expect 40-140)")

f_min, f_max = prod_df['Friability'].min(), prod_df['Friability'].max()
check(0 <= f_min and f_max <= 2, f"Friability range [{f_min:.3f} - {f_max:.3f}] (expect 0-2)")

dr_min, dr_max = prod_df['Dissolution_Rate'].min(), prod_df['Dissolution_Rate'].max()
check(70 <= dr_min and dr_max <= 100, f"Dissolution Rate range [{dr_min:.1f} - {dr_max:.1f}] (expect 70-100)")

print(f"\n[Process File]")
check(len(proc_sheets) == 60, f"Exactly 60 sheets loaded (got {len(proc_sheets)})")

sample_sheet_name = list(proc_sheets.keys())[0]
sample_df = proc_sheets[sample_sheet_name]
phases_found = sorted(sample_df['Phase'].unique().tolist())
expected_phases = sorted(['Blending', 'Coating', 'Compression', 'Drying', 'Granulation', 'Milling', 'Preparation', 'Quality_Testing'])
check(phases_found == expected_phases, f"All 8 phases present in {sample_sheet_name}: {phases_found}")

expected_proc_cols = ['Batch_ID', 'Time_Minutes', 'Phase', 'Temperature_C', 'Pressure_Bar', 
                      'Humidity_Percent', 'Motor_Speed_RPM', 'Compression_Force_kN', 
                      'Flow_Rate_LPM', 'Power_Consumption_kW', 'Vibration_mm_s']

cols_ok = True
bad_sheets_cols = []
for sname, sdf in proc_sheets.items():
    if sorted(sdf.columns.tolist()) != sorted(expected_proc_cols):
        cols_ok = False
        bad_sheets_cols.append(sname)
check(cols_ok, f"All 60 sheets have the same 11 columns (bad: {bad_sheets_cols[:5]})")

neg_power_batches = []
for sname, sdf in proc_sheets.items():
    if (sdf['Power_Consumption_kW'] < 0).any():
        neg_count = (sdf['Power_Consumption_kW'] < 0).sum()
        neg_power_batches.append(f"{sname}({neg_count})")
if neg_power_batches:
    print(f"  {FAIL}: Negative Power_Consumption_kW found in: {', '.join(neg_power_batches)}")
    print(f"        → These MUST be clipped to 0 before energy calculation!")
    errors.append("Negative power values not clipped")
else:
    print(f"  {PASS}: No negative Power_Consumption_kW values in any sheet")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 2 — ENERGY CALCULATION CHECKS")
print("=" * 70)

# Manual T001 check
t001_df = proc_sheets['Batch_T001']
t001_energy_manual = t001_df['Power_Consumption_kW'].clip(lower=0).sum() / 60.0
print(f"\n  T001 manual energy = {t001_energy_manual:.4f} kWh")

with open(os.path.join(brain_dir, "all_batches.json"), 'r') as f:
    all_batches_json = json.load(f)

t001_json = next((b for b in all_batches_json if b['batch_id'] == 'T001'), None)
if t001_json:
    t001_energy_json = t001_json['total_energy_kwh']
    print(f"  T001 JSON energy   = {t001_energy_json:.4f} kWh")
    check(abs(t001_energy_manual - t001_energy_json) < 0.01, 
          f"T001 energy matches manual calc (diff={abs(t001_energy_manual - t001_energy_json):.6f})")
else:
    check(False, "T001 not found in all_batches.json")

energies = [b['total_energy_kwh'] for b in all_batches_json]
e_min, e_max = min(energies), max(energies)
print(f"\n  Energy range: min={e_min:.2f} kWh, max={e_max:.2f} kWh")
check(e_min != e_max, f"Min and max energy are different (no div-by-zero risk)")
check(all(e > 0 for e in energies), f"No batch has zero energy")

e_scores = [b['energy_score'] for b in all_batches_json]
check(all(0 <= s <= 100 for s in e_scores), f"All energy scores in [0, 100]")
check(not any(np.isnan(s) for s in e_scores), f"No NaN energy scores")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 3 — QUALITY SCORING CHECKS")
print("=" * 70)

# Recompute scores independently to cross-check
def get_vals(metric):
    return [b['quality_metrics'][metric] for b in all_batches_json]

diss_vals = get_vals('Dissolution_Rate')
cu_vals = get_vals('Content_Uniformity')
fri_vals = get_vals('Friability')
dt_vals = get_vals('Disintegration_Time')
hard_vals = get_vals('Hardness')

# Friability inversion check
lowest_fri_idx = fri_vals.index(min(fri_vals))
highest_fri_idx = fri_vals.index(max(fri_vals))
q_scores = [b['quality_score'] for b in all_batches_json]

# Compute individual normalized scores for verification
def norm_higher(vals):
    mn, mx = min(vals), max(vals)
    if mx == mn: return [100.0] * len(vals)
    return [100.0 * (v - mn) / (mx - mn) for v in vals]

def norm_lower(vals):
    mn, mx = min(vals), max(vals)
    if mx == mn: return [100.0] * len(vals)
    return [100.0 * (mx - v) / (mx - mn) for v in vals]

def norm_range(vals):
    mn, mx = min(vals), max(vals)
    mid = (mx + mn) / 2.0
    max_dist = mx - mid
    if max_dist == 0: return [100.0] * len(vals)
    return [100.0 * (1 - abs(v - mid) / max_dist) for v in vals]

diss_scores = norm_higher(diss_vals)
cu_scores = norm_higher(cu_vals)
fri_scores = norm_lower(fri_vals)
dt_scores = norm_lower(dt_vals)
hard_scores = norm_range(hard_vals)

print("\n[Individual Metric Score Samples (first 5 batches)]")
print(f"  {'Batch':<8} {'Diss':>8} {'CU':>8} {'Fri':>8} {'DisT':>8} {'Hard':>8}")
for i in range(5):
    bid = all_batches_json[i]['batch_id']
    print(f"  {bid:<8} {diss_scores[i]:>8.2f} {cu_scores[i]:>8.2f} {fri_scores[i]:>8.2f} {dt_scores[i]:>8.2f} {hard_scores[i]:>8.2f}")

print(f"\n[Friability Inversion Check]")
print(f"  Lowest raw Friability: Batch {all_batches_json[lowest_fri_idx]['batch_id']} = {fri_vals[lowest_fri_idx]:.4f}")
print(f"    → Normalized Friability score: {fri_scores[lowest_fri_idx]:.2f}")
print(f"  Highest raw Friability: Batch {all_batches_json[highest_fri_idx]['batch_id']} = {fri_vals[highest_fri_idx]:.4f}")
print(f"    → Normalized Friability score: {fri_scores[highest_fri_idx]:.2f}")
check(fri_scores[lowest_fri_idx] > fri_scores[highest_fri_idx], 
      "Lowest raw Friability has highest Friability SCORE (inversion works)")

print(f"\n[Disintegration Time Inversion Check]")
lowest_dt_idx = dt_vals.index(min(dt_vals))
highest_dt_idx = dt_vals.index(max(dt_vals))
print(f"  Lowest raw DisTime: Batch {all_batches_json[lowest_dt_idx]['batch_id']} = {dt_vals[lowest_dt_idx]:.2f}")
print(f"    → Normalized DisTime score: {dt_scores[lowest_dt_idx]:.2f}")
print(f"  Highest raw DisTime: Batch {all_batches_json[highest_dt_idx]['batch_id']} = {dt_vals[highest_dt_idx]:.2f}")
print(f"    → Normalized DisTime score: {dt_scores[highest_dt_idx]:.2f}")
check(dt_scores[lowest_dt_idx] > dt_scores[highest_dt_idx], 
      "Lowest raw DisTime has highest DisTime SCORE (inversion works)")

print(f"\n[Hardness Range-Based Check]")
hard_mid = (min(hard_vals) + max(hard_vals)) / 2.0
closest_to_mid_idx = min(range(len(hard_vals)), key=lambda i: abs(hard_vals[i] - hard_mid))
highest_hard_idx = hard_vals.index(max(hard_vals))
print(f"  Hardness midpoint: {hard_mid:.2f} N")
print(f"  Closest to midpoint: Batch {all_batches_json[closest_to_mid_idx]['batch_id']} = {hard_vals[closest_to_mid_idx]:.2f} N → score {hard_scores[closest_to_mid_idx]:.2f}")
print(f"  Highest raw Hardness: Batch {all_batches_json[highest_hard_idx]['batch_id']} = {hard_vals[highest_hard_idx]:.2f} N → score {hard_scores[highest_hard_idx]:.2f}")
check(hard_scores[closest_to_mid_idx] >= hard_scores[highest_hard_idx], 
      "Batch closest to midpoint scores higher than batch with max Hardness")

check(all(0 <= s <= 100 for s in q_scores), f"All 60 quality scores in [0, 100]")
check(not any(np.isnan(s) for s in q_scores), f"No NaN quality scores")
check(len(set(round(s, 6) for s in q_scores)) > 50, 
      f"Quality scores have good variance ({len(set(round(s, 6) for s in q_scores))} unique out of 60)")

# Sanity: highest dissolution should correlate with high quality
highest_diss_idx = diss_vals.index(max(diss_vals))
highest_diss_qscore = q_scores[highest_diss_idx]
q_rank = sorted(q_scores, reverse=True).index(highest_diss_qscore) + 1
warn_check(q_rank <= 15, 
           f"Highest Dissolution batch ({all_batches_json[highest_diss_idx]['batch_id']}) ranks #{q_rank} in quality (expect top 15)")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 4 — PRESET RANKING CHECKS")
print("=" * 70)

with open(os.path.join(brain_dir, "golden_signatures.json"), 'r') as f:
    gs_json = json.load(f)

def compute_combined(b, qw, ew):
    return b['quality_score'] * qw + b['energy_score'] * ew

preset_configs = [
    (1, 'Best Quality Only', 1.0, 0.0),
    (2, 'Best Quality + Lowest Energy', 0.6, 0.4),
    (3, 'Lowest Energy Only', 0.0, 1.0)
]

preset_winners = {}
for pid, pname, qw, ew in preset_configs:
    ranked = sorted(all_batches_json, key=lambda b: compute_combined(b, qw, ew), reverse=True)
    print(f"\n  [Preset {pid}: {pname}] Top 5:")
    for i, b in enumerate(ranked[:5]):
        score = compute_combined(b, qw, ew)
        print(f"    #{i+1} {b['batch_id']} — combined={score:.2f} (Q={b['quality_score']:.2f}, E={b['energy_score']:.2f})")
    preset_winners[pid] = ranked[0]['batch_id']
    
    # Verify JSON matches
    gs_key = f"preset_{pid}"
    if gs_key in gs_json:
        json_winner = gs_json[gs_key]['golden_batch_id']
        check(json_winner == ranked[0]['batch_id'], 
              f"Preset {pid} JSON golden ({json_winner}) matches recomputed top ({ranked[0]['batch_id']})")

check(preset_winners[1] != preset_winners[3], 
      f"Preset 1 winner ({preset_winners[1]}) ≠ Preset 3 winner ({preset_winners[3]})")
warn_check(preset_winners[2] != preset_winners[1] and preset_winners[2] != preset_winners[3],
           f"Preset 2 winner ({preset_winners[2]}) is different from both P1 ({preset_winners[1]}) and P3 ({preset_winners[3]})")

print(f"\n  >>> Preset 2 Golden Batch: {preset_winners[2]} (remember for simulation check)")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 5 — GOLDEN SIGNATURE CHECKS")
print("=" * 70)

expected_l1_keys = sorted(['Granulation_Time', 'Binder_Amount', 'Drying_Temp', 'Drying_Time',
                           'Compression_Force', 'Machine_Speed', 'Lubricant_Conc', 'Moisture_Content'])
expected_l2_phases = sorted(['Blending', 'Coating', 'Compression', 'Drying', 'Granulation', 'Milling', 'Preparation', 'Quality_Testing'])
expected_l2_sensors = sorted(['Temperature_C', 'Pressure_Bar', 'Humidity_Percent', 'Motor_Speed_RPM',
                              'Compression_Force_kN', 'Flow_Rate_LPM', 'Power_Consumption_kW', 'Vibration_mm_s'])

for pid in [1, 2, 3]:
    gs_key = f"preset_{pid}"
    gs = gs_json[gs_key]
    print(f"\n  [Preset {pid} — Golden Batch {gs['golden_batch_id']}]")
    
    # Layer 1
    l1_keys = sorted(gs['layer1_settings'].keys())
    check(l1_keys == expected_l1_keys, f"  Layer 1 has all 8 settings keys")
    l1_nulls = [k for k, v in gs['layer1_settings'].items() if v is None]
    check(len(l1_nulls) == 0, f"  Layer 1 no null values (nulls: {l1_nulls})")
    
    # Layer 2
    l2_phases = sorted(gs['layer2_fingerprint'].keys())
    check(l2_phases == expected_l2_phases, f"  Layer 2 has all 8 phases")
    
    l2_sensor_ok = True
    for phase in l2_phases:
        phase_keys = sorted(gs['layer2_fingerprint'][phase].keys())
        if phase_keys != expected_l2_sensors:
            l2_sensor_ok = False
    check(l2_sensor_ok, f"  Layer 2 each phase has all 8 sensor values")
    
    # Layer 3
    check('layer3_outcome' in gs, f"  Layer 3 exists")
    l3 = gs['layer3_outcome']
    check('quality_score' in l3 and 'energy_score' in l3, f"  Layer 3 has quality and energy scores")
    
    # Cross-check Layer 3 score vs all_batches
    ab_match = next((b for b in all_batches_json if b['batch_id'] == gs['golden_batch_id']), None)
    if ab_match:
        check(abs(ab_match['quality_score'] - l3['quality_score']) < 0.001, 
              f"  Layer 3 quality_score matches all_batches ({l3['quality_score']:.4f} vs {ab_match['quality_score']:.4f})")
        check(abs(ab_match['energy_score'] - l3['energy_score']) < 0.001, 
              f"  Layer 3 energy_score matches all_batches ({l3['energy_score']:.4f} vs {ab_match['energy_score']:.4f})")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 6 — JSON OUTPUT CHECKS")
print("=" * 70)

# all_batches.json
print("\n  [all_batches.json]")
check(len(all_batches_json) == 60, f"Exactly 60 entries (got {len(all_batches_json)})")

# pareto_data.json
with open(os.path.join(brain_dir, "pareto_data.json"), 'r') as f:
    pareto_json = json.load(f)
print(f"\n  [pareto_data.json]")
check(len(pareto_json) == 60, f"Exactly 60 entries (got {len(pareto_json)})")
pareto_keys_ok = all(
    isinstance(p.get('quality_score'), (int, float)) and
    isinstance(p.get('energy_score'), (int, float)) and
    isinstance(p.get('total_energy_kwh'), (int, float))
    for p in pareto_json
)
check(pareto_keys_ok, "Every pareto entry has numeric quality_score, energy_score, total_energy_kwh")

# golden_signatures.json
print(f"\n  [golden_signatures.json]")
gs_keys = sorted(gs_json.keys())
# Note: we only have 3 presets (Preset 4 is computed in React)
check('preset_1' in gs_json and 'preset_2' in gs_json and 'preset_3' in gs_json, 
      f"Has preset_1, preset_2, preset_3 (Preset 4 is dynamic in React)")

# simulation_batch.json
with open(os.path.join(brain_dir, "simulation_batch.json"), 'r') as f:
    sim_json = json.load(f)
print(f"\n  [simulation_batch.json]")
sim_batch_id = sim_json['simulation_batch_id']
sim_data = sim_json['data']
check(sim_batch_id != preset_winners[2], 
      f"Simulation batch ({sim_batch_id}) is NOT the Preset 2 golden ({preset_winners[2]})")
check('Phase' in sim_data[0], "Phase column is present in simulation data")
sim_row_count = len(sim_data)
check(195 <= sim_row_count <= 286, f"Row count is {sim_row_count} (expect 195-286)")
print(f"  First row: minute={sim_data[0].get('Time_Minutes')}, phase={sim_data[0].get('Phase')}")
print(f"  Last row:  minute={sim_data[-1].get('Time_Minutes')}, phase={sim_data[-1].get('Phase')}")

# initial_decision_log.json
with open(os.path.join(brain_dir, "initial_decision_log.json"), 'r') as f:
    dl_json = json.load(f)
print(f"\n  [initial_decision_log.json]")
check(len(dl_json) == 6, f"Exactly 6 entries (got {len(dl_json)})")
accepts = sum(1 for d in dl_json if d['operator_decision'] == 'ACCEPTED')
rejects = sum(1 for d in dl_json if d['operator_decision'] == 'REJECTED')
print(f"  Accepts: {accepts}, Rejects: {rejects}")
check(accepts >= 2 and rejects >= 2, f"At least 2 accepts and 2 rejects")
sig_update = any('Golden Signature' in d.get('sensor', '') or 'Golden Signature' in d.get('recommendation', '') for d in dl_json)
check(sig_update, "Contains a golden signature update scenario")

# impact_report.json
with open(os.path.join(brain_dir, "impact_report.json"), 'r') as f:
    ir_json = json.load(f)
print(f"\n  [impact_report.json]")
print(f"  Total actual energy:     {ir_json['total_energy_actual_kwh']:.2f} kWh")
print(f"  If all used golden P2:   {ir_json['total_energy_if_golden2_kwh']:.2f} kWh")
print(f"  Energy saved:            {ir_json['energy_saved_kwh']:.2f} kWh")
print(f"  Projected 1000 batches:  {ir_json['projected_savings_1000_batches_kwh']:.2f} kWh")
print(f"  CO2 equivalent:          {ir_json['co2_equivalent_kg']:.2f} kg")
print(f"  Cost savings:            ${ir_json['cost_savings_usd']:.2f}")
check(ir_json['energy_saved_kwh'] > 0, "Energy saved is positive (golden uses less than average)")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 7 — SIMULATION BATCH CHECK")
print("=" * 70)

p2_gs = gs_json['preset_2']
p2_l2 = p2_gs['layer2_fingerprint']

# Check deviations by band
green = yellow = orange = red = 0
deviation_details = []

for row in sim_data:
    phase = row.get('Phase')
    if phase not in p2_l2:
        continue
    g_phase = p2_l2[phase]
    for sensor in ['Temperature_C', 'Pressure_Bar', 'Motor_Speed_RPM', 'Compression_Force_kN', 
                   'Flow_Rate_LPM', 'Power_Consumption_kW']:
        g_val = g_phase.get(sensor, 0)
        live_val = row.get(sensor, 0)
        if g_val > 0:
            dev = abs(live_val - g_val) / g_val * 100
            if dev < 10:
                green += 1
            elif dev < 20:
                yellow += 1
            elif dev < 30:
                orange += 1
            else:
                red += 1

print(f"\n  Simulation Batch: {sim_batch_id}")
print(f"  Minute-by-minute deviation bands vs Preset 2 Golden:")
print(f"    GREEN  (0-10%):   {green}")
print(f"    YELLOW (10-20%):  {yellow}")
print(f"    ORANGE (20-30%):  {orange}")
print(f"    RED    (30%+):    {red}")

check(yellow > 0, "At least one YELLOW deviation exists")
check(orange > 0, "At least one ORANGE deviation exists")
check(red > 0, "At least one RED deviation exists")

# Spot check: Drying phase temperatures
drying_rows = [r for r in sim_data if r.get('Phase') == 'Drying']
if drying_rows and 'Drying' in p2_l2:
    golden_drying_temp = p2_l2['Drying']['Temperature_C']
    sim_drying_temps = [r['Temperature_C'] for r in drying_rows]
    print(f"\n  Drying Phase Temperature Spot Check:")
    print(f"    Golden Drying Temp: {golden_drying_temp:.2f}°C")
    print(f"    Sim Drying Temps: min={min(sim_drying_temps):.2f}, max={max(sim_drying_temps):.2f}, avg={np.mean(sim_drying_temps):.2f}")
    temp_devs = [abs(t - golden_drying_temp) / golden_drying_temp * 100 for t in sim_drying_temps]
    max_temp_dev = max(temp_devs)
    print(f"    Max temperature deviation: {max_temp_dev:.1f}%")


# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("FINAL SUMMARY")
print("=" * 70)
print(f"\n  Total ERRORS:   {len(errors)}")
for e in errors:
    print(f"    [X] {e}")
print(f"  Total WARNINGS: {len(warnings)}")
for w in warnings:
    print(f"    [!] {w}")

if len(errors) == 0:
    print(f"\n  ALL CRITICAL CHECKS PASSED -- Python Brain is verified!")
else:
    print(f"\n  {len(errors)} CRITICAL ISSUES NEED FIXING before proceeding to React.")
