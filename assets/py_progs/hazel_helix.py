import pyttsx3

engine = pyttsx3.init('sapi5')
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[1].id)  # Hazel - Microsoft Hazel Desktop (English GB)
engine.setProperty('rate', 165)
engine.setProperty('volume', 1.0)

lines = [
    ("hazel_startup.wav",  "Hello. Welcome to the HELIX stack. Starting back end flask server."),
    ("hazel_kill.wav",     "Kill button selected. Closing the flask server."),
]

for filename, text in lines:
    engine.save_to_file(text, filename)
    print(f"Queued: {filename}")

engine.runAndWait()
print("Done — both files saved.")
