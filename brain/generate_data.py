import pandas as pd
import numpy as np
import json
import os

# Set paths
base_dir = r"c:\Users\arpan\OneDrive\Documents\code\Unstop"
prod_path = os.path.join(base_dir, "_h_batch_production_data.xlsx")
proc_path = os.path.join(base_dir, "_h_batch_process_data.xlsx")
out_dir = os.path.join(base_dir, "brain")

print("Loading data...")
prod_df = pd.read_excel(prod_path)
proc_dfs_raw = pd.read_excel(proc_path, sheet_name=None)
# Filter out Summary sheet — only keep Batch_ sheets
proc_dfs = {k: v for k, v in proc_dfs_raw.items() if k.startswith('Batch_')}

all_batches = []
print("Processing batches...")
for idx, row in prod_df.iterrows():
    batch_id = row['Batch_ID']
    sheet_name = f"Batch_{batch_id}"
    if sheet_name not in proc_dfs:
        sheet_name = batch_id # fallback
    
    proc_df = proc_dfs[sheet_name]
    
    # Clip negative power values to 0
    proc_df['Power_Consumption_kW'] = proc_df['Power_Consumption_kW'].clip(lower=0)
    
    total_energy_kwh = float(proc_df['Power_Consumption_kW'].sum() / 60.0)
    
    phase_stats = {}
    grouped = proc_df.groupby('Phase')
    for phase, group in grouped:
        phase_stats[phase] = {
            'Temperature_C': float(group['Temperature_C'].mean()),
            'Pressure_Bar': float(group['Pressure_Bar'].mean()),
            'Humidity_Percent': float(group['Humidity_Percent'].mean()),
            'Motor_Speed_RPM': float(group['Motor_Speed_RPM'].mean()),
            'Compression_Force_kN': float(group['Compression_Force_kN'].mean()),
            'Flow_Rate_LPM': float(group['Flow_Rate_LPM'].mean()),
            'Power_Consumption_kW': float(group['Power_Consumption_kW'].mean()),
            'Vibration_mm_s': float(group['Vibration_mm_s'].max())
        }
        
    batch_data = {
        'batch_id': batch_id,
        'layer1_settings': {
            'Granulation_Time': float(row['Granulation_Time']),
            'Binder_Amount': float(row['Binder_Amount']),
            'Drying_Temp': float(row['Drying_Temp']),
            'Drying_Time': float(row['Drying_Time']),
            'Compression_Force': float(row['Compression_Force']),
            'Machine_Speed': float(row['Machine_Speed']),
            'Lubricant_Conc': float(row['Lubricant_Conc']),
            'Moisture_Content': float(row['Moisture_Content'])
        },
        'quality_metrics': {
            'Dissolution_Rate': float(row['Dissolution_Rate']),
            'Content_Uniformity': float(row['Content_Uniformity']),
            'Friability': float(row['Friability']),
            'Disintegration_Time': float(row['Disintegration_Time']),
            'Hardness': float(row['Hardness'])
        },
        'layer2_fingerprint': phase_stats,
        'total_energy_kwh': total_energy_kwh,
        'raw_process_data': proc_df
    }
    all_batches.append(batch_data)

# Scoring
print("Scoring metrics...")
metrics = {
    'Dissolution_Rate': {'vals': [b['quality_metrics']['Dissolution_Rate'] for b in all_batches]},
    'Content_Uniformity': {'vals': [b['quality_metrics']['Content_Uniformity'] for b in all_batches]},
    'Friability': {'vals': [b['quality_metrics']['Friability'] for b in all_batches]},
    'Disintegration_Time': {'vals': [b['quality_metrics']['Disintegration_Time'] for b in all_batches]},
    'Hardness': {'vals': [b['quality_metrics']['Hardness'] for b in all_batches]},
    'Energy': {'vals': [b['total_energy_kwh'] for b in all_batches]}
}

for k, v in metrics.items():
    v['min'] = min(v['vals'])
    v['max'] = max(v['vals'])
    v['mid'] = (v['max'] + v['min']) / 2.0
    v['max_dist'] = v['max'] - v['mid']

def normalize(val, m_name):
    m = metrics[m_name]
    if m['max'] == m['min']: return 100.0
    
    if m_name in ['Dissolution_Rate', 'Content_Uniformity']: 
        return 100.0 * (val - m['min']) / (m['max'] - m['min'])
    elif m_name in ['Friability', 'Disintegration_Time']:
        return 100.0 * (m['max'] - val) / (m['max'] - m['min'])
    elif m_name == 'Hardness':
        dist = abs(val - m['mid'])
        if m['max_dist'] == 0:
            return 100.0
        return 100.0 * (1 - (dist / m['max_dist']))
    elif m_name == 'Energy':
        return 100.0 * (m['max'] - val) / (m['max'] - m['min'])
    return 0

for b in all_batches:
    q = b['quality_metrics']
    d_score = normalize(q['Dissolution_Rate'], 'Dissolution_Rate')
    u_score = normalize(q['Content_Uniformity'], 'Content_Uniformity')
    f_score = normalize(q['Friability'], 'Friability')
    dt_score = normalize(q['Disintegration_Time'], 'Disintegration_Time')
    h_score = normalize(q['Hardness'], 'Hardness')
    
    q_score = (d_score * 0.3) + (u_score * 0.25) + (f_score * 0.2) + (dt_score * 0.15) + (h_score * 0.1)
    e_score = normalize(b['total_energy_kwh'], 'Energy')
    
    b['quality_score'] = q_score
    b['energy_score'] = e_score

print("Extracting Golden Signatures...")
presets = [
    {'id': 1, 'name': 'Best Quality Only', 'qw': 1.0, 'ew': 0.0},
    {'id': 2, 'name': 'Best Quality + Lowest Energy', 'qw': 0.6, 'ew': 0.4},
    {'id': 3, 'name': 'Lowest Energy Only', 'qw': 0.0, 'ew': 1.0}
]

golden_signatures = {}
p2_layer2 = None

for p in presets:
    top_batch = max(all_batches, key=lambda b: (b['quality_score'] * p['qw']) + (b['energy_score'] * p['ew']))
    top_score = (top_batch['quality_score'] * p['qw']) + (top_batch['energy_score'] * p['ew'])
    
    if p['id'] == 2:
        p2_golden_id = top_batch['batch_id']
        p2_layer2 = top_batch['layer2_fingerprint']
        p2_golden_energy = top_batch['total_energy_kwh']
        
    golden_signatures[f"preset_{p['id']}"] = {
        'preset_id': p['id'],
        'preset_name': p['name'],
        'golden_batch_id': top_batch['batch_id'],
        'layer1_settings': top_batch['layer1_settings'],
        'layer2_fingerprint': top_batch['layer2_fingerprint'],
        'layer3_outcome': {
            'quality_metrics': top_batch['quality_metrics'],
            'total_energy_kwh': top_batch['total_energy_kwh'],
            'quality_score': top_batch['quality_score'],
            'energy_score': top_batch['energy_score'],
            'combined_score': top_score
        }
    }

print("Identifying Simulation Batch...")
sim_candidates = []
sensors_to_check = ['Temperature_C', 'Pressure_Bar', 'Humidity_Percent', 'Motor_Speed_RPM', 'Compression_Force_kN', 'Flow_Rate_LPM', 'Power_Consumption_kW']

for b in all_batches:
    if b['batch_id'] == p2_golden_id:
        continue
    
    dev_count = 0
    for phase, stats in b['layer2_fingerprint'].items():
        if phase in p2_layer2:
            g_stats = p2_layer2[phase]
            for s in sensors_to_check:
                g_val = g_stats[s]
                b_val = stats[s]
                if g_val > 0:
                    dev = abs(b_val - g_val) / g_val * 100
                    if dev > 15:
                        dev_count += 1
                        
    sim_candidates.append({
        'batch_id': b['batch_id'],
        'dev_count': dev_count,
        'raw_df': b['raw_process_data']
    })

best_sim = max(sim_candidates, key=lambda x: x['dev_count'])
print(f"Simulation Batch selected: {best_sim['batch_id']} with {best_sim['dev_count']} deviations > 15% vs Preset 2 Golden ({p2_golden_id})")

print("Generating JSON structures...")
# prepare files
all_batches_out = []
for b in all_batches:
    all_batches_out.append({
        'batch_id': b['batch_id'],
        'layer1_settings': b['layer1_settings'],
        'layer2_fingerprint': b['layer2_fingerprint'],
        'quality_metrics': b['quality_metrics'],
        'total_energy_kwh': b['total_energy_kwh'],
        'quality_score': b['quality_score'],
        'energy_score': b['energy_score']
    })

pareto_out = [{
    'batch_id': b['batch_id'],
    'quality_score': b['quality_score'],
    'energy_score': b['energy_score'],
    'total_energy_kwh': b['total_energy_kwh']
} for b in all_batches]

impact_report = {
    'total_energy_actual_kwh': sum(b['total_energy_kwh'] for b in all_batches),
    'total_energy_if_golden2_kwh': 60 * p2_golden_energy,
    'energy_saved_kwh': sum(b['total_energy_kwh'] for b in all_batches) - (60 * p2_golden_energy),
    'projected_savings_1000_batches_kwh': (sum(b['total_energy_kwh'] for b in all_batches) - (60 * p2_golden_energy)) / 60 * 1000,
    'co2_equivalent_kg': ((sum(b['total_energy_kwh'] for b in all_batches) - (60 * p2_golden_energy)) / 60 * 1000) * 0.4,
    'cost_savings_usd': ((sum(b['total_energy_kwh'] for b in all_batches) - (60 * p2_golden_energy)) / 60 * 1000) * 0.15
}

initial_decision_log = [
    {
        "id": "dec-001",
        "timestamp": "2026-03-01T10:15:00Z",
        "batch_id": "T012",
        "phase": "Drying",
        "sensor": "Temperature_C",
        "deviation_percent": "+20.5",
        "recommendation": "Reduce temperature toward 63.2°C",
        "operator_decision": "ACCEPTED",
        "reason": "",
        "outcome_score": "88/100"
    },
    {
        "id": "dec-002",
        "timestamp": "2026-03-02T14:22:00Z",
        "batch_id": "T018",
        "phase": "Granulation",
        "sensor": "Motor_Speed_RPM",
        "deviation_percent": "-18.2",
        "recommendation": "Increase motor speed toward 145 RPM",
        "operator_decision": "REJECTED",
        "reason": "Raw material batch is wetter than usual",
        "outcome_score": "84/100"
    },
    {
        "id": "dec-003",
        "timestamp": "2026-03-03T09:45:00Z",
        "batch_id": "T025",
        "phase": "Compression",
        "sensor": "Compression_Force_kN",
        "deviation_percent": "+24.7",
        "recommendation": "Reduce compression force toward 18.5 kN",
        "operator_decision": "ACCEPTED",
        "reason": "",
        "outcome_score": "91/100"
    },
    {
        "id": "dec-004",
        "timestamp": "2026-03-04T11:30:00Z",
        "batch_id": "T038",
        "phase": "Drying",
        "sensor": "Temperature_C",
        "deviation_percent": "-22.1",
        "recommendation": "Increase temperature toward 63.2°C",
        "operator_decision": "REJECTED",
        "reason": "Scheduled maintenance already planned for heater",
        "outcome_score": "79/100"
    },
    {
        "id": "dec-005",
        "timestamp": "2026-03-05T16:05:00Z",
        "batch_id": "T055",
        "phase": "All",
        "sensor": "New Golden Signature",
        "deviation_percent": "N/A",
        "recommendation": "Accept Batch T055 as new Golden Signature for Preset 2",
        "operator_decision": "ACCEPTED",
        "reason": "Improved Quality score by 2% while reducing energy.",
        "outcome_score": "95/100"
    },
    {
        "id": "dec-006",
        "timestamp": "2026-03-06T08:10:00Z",
        "batch_id": "T059",
        "phase": "Granulation",
        "sensor": "Flow_Rate_LPM",
        "deviation_percent": "+16.8",
        "recommendation": "Reduce flow rate toward 4.2 LPM",
        "operator_decision": "ACCEPTED",
        "reason": "",
        "outcome_score": "Pending"
    }
]

print("Writing JSON files...")
def save_json(name, data):
    with open(os.path.join(out_dir, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        print(f"Saved {name}")

save_json("golden_signatures.json", golden_signatures)
save_json("pareto_data.json", pareto_out)
save_json("all_batches.json", all_batches_out)
save_json("simulation_batch.json", {'simulation_batch_id': best_sim['batch_id'], 'data': best_sim['raw_df'].to_dict(orient='records')})
save_json("impact_report.json", impact_report)
save_json("initial_decision_log.json", initial_decision_log)

print("All Python Brain processing is complete!")
