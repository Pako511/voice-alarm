import uuid
import logging
import shutil
import os
import homeassistant.util.dt as dt_util
from homeassistant.core import ServiceCall, callback
from homeassistant.helpers import storage
from .sensor import VoiceAlarmSensor
import voluptuous as vol
from datetime import datetime, timedelta

_LOGGER = logging.getLogger(__name__)

DOMAIN = "voice_alarm"
ALARMS_STORAGE_KEY = f"{DOMAIN}.alarms"
STORAGE_VERSION = 1
SERVICE_SET_ALARM = "set_alarm"
SERVICE_REMOVE_ALARM = "remove_alarm"
SERVICE_TOGGLE_ALARM = "toggle_alarm"

async def async_setup(hass, config):
    """Set up the Voice Alarm component."""
    # Copy custom sentences
    source_dir = os.path.join(os.path.dirname(__file__), 'custom_sentences')
    dest_dir = hass.config.path("custom_sentences")
    
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
    
    if os.path.exists(source_dir):
        for lang in os.listdir(source_dir):
            lang_source = os.path.join(source_dir, lang)
            lang_dest = os.path.join(dest_dir, lang)
            
            if not os.path.exists(lang_dest):
                os.makedirs(lang_dest)
            
            for file in os.listdir(lang_source):
                source_file = os.path.join(lang_source, file)
                dest_file = os.path.join(lang_dest, file)
                
                if not os.path.exists(dest_file):
                    shutil.copy(source_file, dest_file)
                    _LOGGER.info(f"Copied voice sentence: {lang}/{file}")

    store = storage.Store(hass, STORAGE_VERSION, ALARMS_STORAGE_KEY)
    alarms = await store.async_load() or []

    # Register services
    async def handle_set_alarm(call: ServiceCall):
        """Handle setting a new alarm."""
        time_str = call.data["time"]
        try:
            alarm_time = dt_util.parse_time(time_str)
            if not alarm_time:
                raise ValueError(f"Formato orario non valido: {time_str}")
            
            alarm_id = str(uuid.uuid4())
            next_ring = dt_util.now().replace(
                hour=alarm_time.hour,
                minute=alarm_time.minute,
                second=0,
                microsecond=0
            )
            
            if next_ring < dt_util.now():
                next_ring += timedelta(days=1)
            
            new_alarm = {
                "id": alarm_id,
                "time": time_str,
                "enabled": True,
                "next_ring": next_ring.isoformat()
            }
            
            alarms.append(new_alarm)
            await store.async_save(alarms)
            hass.bus.async_fire(f"{DOMAIN}_updated", {"action": "set", "alarm": new_alarm})
            if DOMAIN in hass.data:
                await hass.data[DOMAIN]["sensor"].async_update()
            
        except Exception as e:
            _LOGGER.error("Errore impostazione sveglia: %s", str(e))

    async def handle_remove_alarm(call: ServiceCall):
        """Handle removing an alarm."""
        alarm_id = call.data["id"]
        for i, alarm in enumerate(alarms):
            if alarm["id"] == alarm_id:
                removed = alarms.pop(i)
                await store.async_save(alarms)
                hass.bus.async_fire(f"{DOMAIN}_updated", {"action": "remove", "alarm": removed})
                if DOMAIN in hass.data:
                    await hass.data[DOMAIN]["sensor"].async_update()
                _LOGGER.info("Sveglia %s rimossa", alarm_id)
                return
        _LOGGER.warning("Sveglia con ID %s non trovata", alarm_id)

    async def handle_toggle_alarm(call: ServiceCall):
        """Handle toggling alarm state."""
        alarm_id = call.data["id"]
        for alarm in alarms:
            if alarm["id"] == alarm_id:
                alarm["enabled"] = not alarm["enabled"]
                await store.async_save(alarms)
                action = "enabled" if alarm["enabled"] else "disabled"
                hass.bus.async_fire(f"{DOMAIN}_updated", {"action": action, "alarm": alarm})
                if DOMAIN in hass.data:
                    await hass.data[DOMAIN]["sensor"].async_update()
                _LOGGER.info("Sveglia %s %s", alarm_id, action)
                return
        _LOGGER.warning("Sveglia con ID %s non trovata", alarm_id)

    hass.services.async_register(
        DOMAIN, SERVICE_SET_ALARM, handle_set_alarm, schema=vol.Schema({"time": str})
    )
    
    hass.services.async_register(
        DOMAIN, SERVICE_REMOVE_ALARM, handle_remove_alarm, schema=vol.Schema({"id": str})
    )
    
    hass.services.async_register(
        DOMAIN, SERVICE_TOGGLE_ALARM, handle_toggle_alarm, schema=vol.Schema({"id": str})
    )

    # Alarm checking logic
    @callback
    def check_alarms(time=None):
        """Check if any alarm should be triggered."""
        now = dt_util.now()
        for alarm in alarms:
            if not alarm["enabled"]:
                continue
                
            next_ring = dt_util.parse_datetime(alarm["next_ring"])
            if next_ring and now >= next_ring and (now - next_ring).total_seconds() < 60:
                # Trigger alarm
                hass.bus.async_fire(f"{DOMAIN}_ring", {"alarm": alarm})
                
                # Schedule next ring for tomorrow
                alarm["next_ring"] = (next_ring + timedelta(days=1)).isoformat()
                hass.async_create_task(store.async_save(alarms))

    # Run every minute
    hass.helpers.event.async_track_time_interval(check_alarms, timedelta(minutes=1))

    # Create sensor
    sensor = VoiceAlarmSensor(hass, alarms, store)
    await sensor.async_update()
    hass.data[DOMAIN] = {"sensor": sensor, "alarms": alarms, "store": store}

    return True