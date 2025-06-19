# Voice Alarm Documentation

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)


## Configuration
Add to `configuration.yaml`:
voice_alarm:
Voice Commands
Set alarm: "Svegliami alle 7:15", "Imposta sveglia alle 8:00"

Remove alarm: "Rimuovi sveglia alle 7:15", "Cancella allarme alle 8:00"

Toggle alarm: "Disattiva sveglia alle 7:15", "Attiva sveglia alle 8:00"

Services
voice_alarm.set_alarm
Set a new alarm

Parameter	Type	Description
time	string	Time in HH:MM format
voice_alarm.remove_alarm
Remove an existing alarm

Parameter	Type	Description
id	string	Alarm ID
voice_alarm.toggle_alarm
Enable/disable an alarm

Parameter	Type	Description
id	string	Alarm ID
Lovelace Card
Add to your Lovelace UI:

yaml
type: entities
entities:
  - entity: sensor.voice_alarms
Events
voice_alarm_ring: Triggered when alarm activates

voice_alarm_updated: Triggered when alarms change

Example Automations
Basic alarm ring
yaml
automation:
  - alias: "Voice Alarm Ring"
    trigger:
      platform: event
      event_type: voice_alarm_ring
    action:
      - service: tts.google_translate_say
        data:
          message: "Sveglia! Sono le {{ trigger.event.data.alarm.time }}"
          entity_id: media_player.living_room_speaker
With lights
yaml
automation:
  - alias: "Voice Alarm with Lights"
    trigger:
      platform: event
      event_type: voice_alarm_ring
    action:
      - service: tts.google_translate_say
        data:
          message: "Buongiorno! Sono le {{ trigger.event.data.alarm.time }}"
          entity_id: media_player.bedroom_speaker
      - service: light.turn_on
        target:
          entity_id: light.bedroom_lights
        data:
          brightness: 150
          color_temp: 320


