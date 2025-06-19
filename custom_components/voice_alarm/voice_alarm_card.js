class VoiceAlarmCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card header="Voice Alarms">
          <div class="card-content"></div>
        </ha-card>
      `;
      this.content = this.querySelector('.card-content');
    }
    
    const alarms = hass.states['sensor.voice_alarms'].attributes.alarms || [];
    this.content.innerHTML = `
      <table style="width:100%">
        <tr>
          <th>Time</th>
          <th>Status</th>
          <th>Next Ring</th>
          <th>Actions</th>
        </tr>
        ${alarms.map(alarm => `
          <tr>
            <td>${alarm.time}</td>
            <td>${alarm.enabled ? '✅ Active' : '❌ Disabled'}</td>
            <td>${new Date(alarm.next_ring).toLocaleTimeString()}</td>
            <td>
              <button class="toggle" data-id="${alarm.id}">
                ${alarm.enabled ? 'Disable' : 'Enable'}
              </button>
              <button class="remove" data-id="${alarm.id}">Remove</button>
            </td>
          </tr>
        `).join('')}
      </table>
      <button id="add-alarm">Add New Alarm</button>
    `;
    
    this.querySelectorAll('.toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        hass.callService('voice_alarm', 'toggle_alarm', { id });
      });
    });
    
    this.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        hass.callService('voice_alarm', 'remove_alarm', { id });
      });
    });
    
    this.querySelector('#add-alarm').addEventListener('click', () => {
      const time = prompt("Enter time (HH:MM):");
      if (time) hass.callService('voice_alarm', 'set_alarm', { time });
    });
  }
}

customElements.define('voice-alarm-card', VoiceAlarmCard);