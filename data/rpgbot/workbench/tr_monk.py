import importlib.util
import pathlib

HERE = pathlib.Path(__file__).parent
TITLE = "Монах — класовий гайд D&D 5e 2014"
TOPICS = "Монах, класовий гайд, риси, раси, мультикласування"
HEADINGS = {}
FRAGMENTS = {}

for part in sorted(HERE.glob("tr_monk_part*.py")):
    spec = importlib.util.spec_from_file_location(part.stem, part)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    HEADINGS.update(getattr(module, "HEADINGS", {}))
    FRAGMENTS.update(module.FRAGMENTS)
