#!/usr/bin/env bash
# Generates the soundtrack + SFX with ElevenLabs. Run once; outputs land in public/audio.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${ELEVENLABS_API_KEY:?add ELEVENLABS_API_KEY to .env}"
OUT=public/audio; mkdir -p "$OUT"

music() { # name prompt ms
  local name=$1 prompt=$2 ms=$3
  [ -s "$OUT/$name.mp3" ] && { echo "skip $name"; return; }
  echo "music: $name"
  local http
  http=$(curl -sS --max-time 900 -o "$OUT/$name.tmp" -w '%{http_code}' -X POST \
    "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
    -d "$(jq -n --arg p "$prompt" --argjson ms "$ms" '{prompt:$p, music_length_ms:$ms}')")
  if [ "$http" = 200 ] && [ "$(wc -c < "$OUT/$name.tmp")" -gt 50000 ]; then mv "$OUT/$name.tmp" "$OUT/$name.mp3"; echo "ok $name"; else echo "FAIL $name http=$http"; head -c 400 "$OUT/$name.tmp"; echo; rm -f "$OUT/$name.tmp"; fi
}
sfx() { # name prompt seconds
  local name=$1 prompt=$2 secs=$3
  [ -s "$OUT/$name.mp3" ] && { echo "skip $name"; return; }
  echo "sfx: $name"
  local http
  http=$(curl -sS --max-time 300 -o "$OUT/$name.tmp" -w '%{http_code}' -X POST \
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
    -d "$(jq -n --arg p "$prompt" --argjson s "$secs" '{text:$p, duration_seconds:$s, prompt_influence:0.6}')")
  if [ "$http" = 200 ] && [ "$(wc -c < "$OUT/$name.tmp")" -gt 2000 ]; then mv "$OUT/$name.tmp" "$OUT/$name.mp3"; echo "ok $name"; else echo "FAIL $name http=$http"; head -c 400 "$OUT/$name.tmp"; echo; rm -f "$OUT/$name.tmp"; fi
}

music theme "Upbeat playful chiptune-meets-ukulele video game loop, bouncy marimba and plucky synth bass, hand claps, 128 BPM, cheerful sunny farm-road adventure feel, instrumental only, no vocals, seamless loop with no intro or outro" 90000 &
music menu "Gentle warm lo-fi ukulele and soft synth pad, relaxed 90 BPM, cozy pastel video game title screen music, instrumental only, no vocals, seamless loop" 60000 &
wait
sfx hop "short cute cartoon car hop boing, tiny springy bounce, clean, no reverb" 0.6
sfx coin "bright crisp video game coin pickup chime, short sparkle ding" 0.7
sfx crash "cartoon car crash thud with a comical bonk and a short animal moo, punchy, short" 1.2
sfx honk "quick cute little cartoon car horn honk, two short beeps" 0.8
sfx splash "cartoon water splash plop, short" 0.9
sfx buy "satisfying cash register cha-ching purchase confirm, short and cheerful" 1.0
sfx eagle "large eagle screech swoop whoosh, dramatic, short" 1.5
sfx whoosh "soft UI whoosh swipe, very short" 0.5
sfx stampede "distant thundering herd of buffalo hooves rumbling approaching, short" 2.0
sfx record "triumphant short video game fanfare new high score jingle, 8-bit meets orchestral, 2 seconds" 2.0
ls -la "$OUT"
