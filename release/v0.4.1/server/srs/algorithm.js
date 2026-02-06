// Pure SM-2 Implementation
// q: 0-5
// previous: { interval, repetitions, easeFactor }
// returns: { interval, repetitions, easeFactor, dueDate }

function calculate(q, previous) {
    let interval = previous.interval || 0;
    let repetitions = previous.repetitions || 0;
    let easeFactor = previous.easeFactor || 2.5;

    if (q >= 3) {
        // Correct response
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions++;
    } else {
        // Incorrect response
        repetitions = 0;
        interval = 1;
    }

    // Update Ease Factor
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calculate Due Date (Interval in Minutes for testing, or Days usually)
    // For this Level Test context, let's use Minutes to allow fast feedback demonstration?
    // Standard SM-2 is Days. Let's use Days by default, but allow a "scale" config.
    // Assuming context is "Learning", Minutes might be better for "Session".
    // Let's stick to "Minutes" for granular control in this MVP.
    
    const now = Date.now();
    const dueDate = now + (interval * 60 * 1000); // Interval in Minutes

    return {
        interval,
        repetitions,
        easeFactor, // Float precision
        dueDate
    };
}

module.exports = { calculate };
