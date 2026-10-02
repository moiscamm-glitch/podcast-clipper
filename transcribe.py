# transcribe.py
import sys, json, whisper

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 transcribe.py <input> <output.json>")
        sys.exit(1)
    input_path, output_path = sys.argv[1], sys.argv[2]
    print("Loading Whisper model (base)...")
    model = whisper.load_model("base")
    print(f"Transcribing {input_path} — this can take a while...")
    result = model.transcribe(input_path, verbose=False, word_timestamps=True)
    segments = []
    for seg in result["segments"]:
        words = [{"start": w["start"], "end": w["end"], "word": w["word"].strip()} for w in seg.get("words", [])]
        segments.append({"start": seg["start"], "end": seg["end"], "text": seg["text"].strip(), "words": words})
    with open(output_path, "w") as f:
        json.dump(segments, f, indent=2)
    print(f"Done. {len(segments)} segments written to {output_path}")

if __name__ == "__main__":
    main()
