import torch
import sys

print(f"Python: {sys.version}")
print(f"Torch: {torch.__version__}")
print(f"File: {torch.__file__}")
print(f"CUDA Available: {torch.cuda.is_available()}")

if not torch.cuda.is_available():
    print("\nTroubleshooting CUDA:")
    try:
        import torch.cuda as cuda
        print(f"Device Count: {cuda.device_count()}")
        print(f"CUDA Version (Torch): {torch.version.cuda}")
        # Try to trigger a CUDA init and catch the error
        torch.ones(1).cuda()
    except Exception as e:
        print(f"Error during CUDA init: {e}")
else:
    print(f"Device Name: {torch.cuda.get_device_name(0)}")
