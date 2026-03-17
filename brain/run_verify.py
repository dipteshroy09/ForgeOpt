import subprocess
result = subprocess.run(
    ['python', 'brain/verify_all.py'],
    capture_output=True, text=True, encoding='utf-8', errors='replace',
    cwd=r'c:\Users\arpan\OneDrive\Documents\code\Unstop'
)
with open(r'c:\Users\arpan\OneDrive\Documents\code\Unstop\brain\verify_result.txt', 'w', encoding='utf-8') as f:
    f.write(result.stdout)
    if result.stderr:
        f.write('\n\nSTDERR:\n' + result.stderr)
print("DONE, exit code:", result.returncode)
