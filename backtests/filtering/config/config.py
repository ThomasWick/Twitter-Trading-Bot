import json
from types import SimpleNamespace

with open("./config/filter_config.json") as json_data_file:
    json_data_string = json_data_file.read()

filter_config = json.loads(
    json_data_string, object_hook=lambda d: SimpleNamespace(**d))
