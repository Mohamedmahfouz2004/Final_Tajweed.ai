import json
import sys
from typing import Literal, get_args, get_origin
from pydantic_core import PydanticUndefined

try:
    from quran_transcript import MoshafAttributes
    from quran_transcript.phonetics.moshaf_attributes import get_arabic_name, get_arabic_attributes
except ImportError:
    print("Error: quran_transcript not found")
    sys.exit(1)

fields = MoshafAttributes.model_fields
schema = {}

for k, v in fields.items():
    default_val = v.default if v.default is not PydanticUndefined else None
    
    schema[k] = {
        'label': get_arabic_name(v) or k,
        'help': v.description or '',
        'type': 'bool' if v.annotation == bool else 'number' if v.annotation in (int, float) else 'select' if get_origin(v.annotation) is Literal else 'string',
        'default': default_val,
        'choices': list(get_args(v.annotation)) if get_origin(v.annotation) is Literal else None,
        'ar_choices': get_arabic_attributes(v) if get_origin(v.annotation) is Literal else None
    }

with open('moshaf_schema.json', 'w', encoding='utf-8') as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)

print("Schema extracted successfully to moshaf_schema.json")
