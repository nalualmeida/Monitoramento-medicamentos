self.addEventListener('push', function(event) {
    const options = {
      body: event.data ? event.data.text() : 'Lembrete de Medicamento',
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2'
      },
      actions: [
        {
          action: 'playSound',
          title: 'Tocar som',
        }
      ]
    };
  
    event.waitUntil(
      self.registration.showNotification('Minha Terapia', options)
    );
  });
  
  self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.action === 'playSound') {
      clients.openWindow('/alarme.ejs');
    } else {
      clients.openWindow('/');
    }
  });
  
  