"""
Example model: Simple image grayscale converter
This demonstrates the required predict.py interface.
"""
import os
from PIL import Image


def run(input_path: str, output_dir: str) -> dict:
    """
    Required function signature for CV Platform models.

    Args:
        input_path: Path to the input image file
        output_dir: Directory where output files should be written

    Returns:
        dict: JSON-serializable metadata about the processing
    """
    # Load the input image
    img = Image.open(input_path)

    # Convert to grayscale
    grayscale_img = img.convert('L')

    # Save the output
    output_path = os.path.join(output_dir, "output.png")
    grayscale_img.save(output_path)

    # Return metadata
    return {
        "input_size": img.size,
        "output_size": grayscale_img.size,
        "input_mode": img.mode,
        "output_mode": grayscale_img.mode,
        "message": "Successfully converted to grayscale"
    }
