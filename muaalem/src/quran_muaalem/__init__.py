from .inference import Muaalem
from .muaalem_typing import MuaalemOutput, Unit, Sifa, SingleUnit
from .explain import explain_for_terminal


__all__ = [
    "Muaalem",
    "MuaalemOutput",
    "Unit",
    "Sifa",
    "SingleUnit",
    "explain_for_terminal",
]

# Optional streaming support — only available when streaming deps are installed
try:
    from .streaming import StreamingConfig, StreamingPipeline
    __all__ += ["StreamingConfig", "StreamingPipeline"]
except ImportError:
    pass
