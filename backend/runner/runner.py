import sys
import json
import os
import traceback

sys.path.insert(0, '/app/user_code')

try:
    from predict import run

    input_path = '/workspace/in/input.png'
    output_dir = '/workspace/out'

    # Find the actual input file
    input_files = os.listdir('/workspace/in')
    if input_files:
        input_path = os.path.join('/workspace/in', input_files[0])

    result = run(input_path, output_dir)

    # Verify at least one output file was created
    output_files = os.listdir(output_dir)
    if not output_files:
        raise RuntimeError("No output files generated")

    print(json.dumps({"status": "success", "result": result}))

except Exception as e:
    error_msg = traceback.format_exc()
    print(json.dumps({"status": "error", "error": str(e), "traceback": error_msg}), file=sys.stderr)
    sys.exit(1)
