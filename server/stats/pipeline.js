const { v4: uuidv4 } = require('uuid');

module.exports = {
    push: (event) => {
        // Mock pipeline: Log event and acknowledge
        // In a real app, this would enqueue the event for async processing
        // console.log(`[Pipeline] Event ${event.eventId}: ${event.type}`);
        return Promise.resolve(event);
    },
    start: () => {
        console.log('Pipeline started (Mock)');
    }
};
