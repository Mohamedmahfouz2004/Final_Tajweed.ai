class AnalyticsEngine:
    @staticmethod
    def process_session(chunks: list[dict]) -> dict:
        if not chunks:
            return {}
            
        total_chunks = len(chunks)
        model_times = []
        post_times = []
        total_times = []
        gpu_mems = []
        
        for c in chunks:
            model_ms = (c.get("model_output_time", 0) - c.get("model_input_time", 0)) * 1000
            post_ms = (c.get("frontend_render_time", 0) - c.get("model_output_time", 0)) * 1000
            total_ms = (c.get("frontend_render_time", 0) - c.get("model_input_time", 0)) * 1000
            
            model_times.append(model_ms)
            post_times.append(post_ms)
            total_times.append(total_ms)
            gpu_mems.append(c.get("gpu_memory", 0))
            
        return {
            "total_chunks": total_chunks,
            "avg_model_ms": sum(model_times) / total_chunks if total_chunks else 0,
            "avg_post_ms": sum(post_times) / total_chunks if total_chunks else 0,
            "avg_total_ms": sum(total_times) / total_chunks if total_chunks else 0,
            "avg_gpu_mem_mb": sum(gpu_mems) / total_chunks if total_chunks else 0,
            "max_model_ms": max(model_times) if model_times else 0,
            "max_total_ms": max(total_times) if total_times else 0,
            "chunks_data": chunks
        }
