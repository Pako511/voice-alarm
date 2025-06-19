import logging
from homeassistant.helpers.entity import Entity
from homeassistant.helpers import storage
import homeassistant.util.dt as dt_util

_LOGGER = logging.getLogger(__name__)

class VoiceAlarmSensor(Entity):
    """Sensor to expose alarms to Lovelace."""
    
    def __init__(self, hass, alarms, store):
        self._hass = hass
        self._alarms = alarms
        self._store = store
        self._state = len(alarms)
        self._attrs = {}

    @property
    def name(self):
        return "Voice Alarms"

    @property
    def state(self):
        return self._state

    @property
    def icon(self):
        return "mdi:alarm"

    @property
    def extra_state_attributes(self):
        active_count = sum(1 for a in self._alarms if a["enabled"])
        next_alarm = None
        
        # Find next upcoming alarm
        now = dt_util.now()
        for alarm in sorted(self._alarms, key=lambda x: x["next_ring"]):
            if alarm["enabled"]:
                alarm_time = dt_util.parse_datetime(alarm["next_ring"])
                if alarm_time > now:
                    next_alarm = alarm_time.isoformat()
                    break
        
        return {
            "alarms": self._alarms,
            "active_alarms": active_count,
            "next_alarm": next_alarm
        }

    async def async_update(self):
        self._alarms = await self._store.async_load() or []
        self._state = len(self._alarms)
        self.async_write_ha_state()