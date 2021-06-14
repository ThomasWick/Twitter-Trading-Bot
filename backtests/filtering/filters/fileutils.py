from datetime import datetime
from pathlib import Path

# Appends keyword and timestamp to input filename


def create_output_filename(input_filename, keyword):
    path = Path(input_filename)
    filename_stem = path.stem
    filename_extension = path.suffix

    timestamp = datetime.now().strftime("%Y_%m_%d-%I:%M:%S_%p")

    return f"{filename_stem}_{keyword}_{timestamp}{filename_extension}"

# Create filepath by combining keyworded, timestamped input filename with the output dir


def create_filtered_filepath(keyword, input_file_path, output_directory):
    output_filename = create_output_filename(
        str(Path(input_file_path).name), keyword)

    return str(Path(output_directory) / output_filename)
