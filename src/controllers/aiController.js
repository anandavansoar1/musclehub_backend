const asyncHandler = require('express-async-handler');

// @desc    Generate AI Workout Plan
// @route   POST /api/ai/generate-workout
// @access  Private
const generateWorkout = asyncHandler(async (req, res) => {
    const { goal, experience, focus, duration } = req.body;

    if (!goal || !experience || !focus || !duration) {
        res.status(400);
        throw new Error('Please provide all details: goal, experience, focus, and duration');
    }

    // Simulated AI Logic - In a real app, this could call OpenAI or a complex rule engine
    // For MuscleHub, we use a robust predefined mapping to feel "intelligent"

    const exerciseDatabase = {
        'Chest': [
            { name: 'Bench Press', reps: '3x10', instruction: 'Keep back flat on bench and drive weight up.' },
            { name: 'Incline DB Press', reps: '3x12', instruction: 'Focus on upper chest engagement.' },
            { name: 'Pushups', reps: '3xAMRAP', instruction: 'Complete to failure with good form.' },
            { name: 'Cable Flyes', reps: '3x15', instruction: 'Squeeze at the center for a peak contraction.' }
        ],
        'Back': [
            { name: 'Deadlift', reps: '3x5', instruction: 'Maintain a neutral spine throughout.' },
            { name: 'Lat Pulldowns', reps: '3x10', instruction: 'Pull with your elbows, not your hands.' },
            { name: 'Seated Row', reps: '3x12', instruction: 'Squeeze shoulder blades together.' },
            { name: 'Pullups', reps: '3x8', instruction: 'Full range of motion for best results.' }
        ],
        'Legs': [
            { name: 'Squats', reps: '3x10', instruction: 'Go below parallel if mobility allows.' },
            { name: 'Leg Press', reps: '3x12', instruction: 'Do not lock your knees at the top.' },
            { name: 'Lunges', reps: '3x10/side', instruction: 'Keep torso upright.' },
            { name: 'Leg Extensions', reps: '3x15', instruction: 'Focus on the quad contraction.' }
        ],
        'Shoulders': [
            { name: 'OHP (Overhead Press)', reps: '3x8', instruction: 'Tighten core to protect lower back.' },
            { name: 'Lateral Raises', reps: '3x15', instruction: 'Slight bend in elbows, lead with pinkies.' },
            { name: 'Front Raises', reps: '3x12', instruction: 'Control the weight on the way down.' }
        ],
        'Arms': [
            { name: 'Bicep Curls', reps: '3x12', instruction: 'No swinging, keep elbows tucked.' },
            { name: 'Tricep Pushdowns', reps: '3x15', instruction: 'Lock out fully at the bottom.' },
            { name: 'Hammer Curls', reps: '3x12', instruction: 'Focus on the brachialis.' }
        ],
        'Abs': [
            { name: 'Plank', reps: '3x1m', instruction: 'Keep a straight line from head to heels.' },
            { name: 'Leg Raises', reps: '3x15', instruction: 'Lower slowly for maximum tension.' },
            { name: 'Crunches', reps: '3x20', instruction: 'Exhale as you crunch up.' }
        ]
    };

    let selectedExercises = [];

    if (focus === 'Full Body') {
        selectedExercises = [
            exerciseDatabase['Chest'][0],
            exerciseDatabase['Back'][0],
            exerciseDatabase['Legs'][0],
            exerciseDatabase['Shoulders'][0],
            exerciseDatabase['Arms'][0],
            exerciseDatabase['Abs'][0]
        ];
    } else if (focus === 'Upper Body') {
        selectedExercises = [
            ...exerciseDatabase['Chest'].slice(0, 2),
            ...exerciseDatabase['Back'].slice(0, 2),
            ...exerciseDatabase['Shoulders'].slice(0, 1),
            ...exerciseDatabase['Arms'].slice(0, 1)
        ];
    } else if (focus === 'Lower Body') {
        selectedExercises = [
            ...exerciseDatabase['Legs'],
            ...exerciseDatabase['Abs'].slice(0, 2)
        ];
    } else {
        // Specific muscle group focus
        selectedExercises = exerciseDatabase[focus] || exerciseDatabase['Chest'];
    }

    // Adjust reps/sets based on goal
    if (goal === 'Strength') {
        selectedExercises = selectedExercises.map(ex => ({ ...ex, reps: '5x5', intensity: 'Heavy' }));
    } else if (goal === 'Muscle Gain') {
        selectedExercises = selectedExercises.map(ex => ({ ...ex, reps: '4x10', intensity: 'Moderate-Heavy' }));
    } else {
        // Weight Loss / Endurance
        selectedExercises = selectedExercises.map(ex => ({ ...ex, reps: '3x20', intensity: 'Moderate - High Intensity' }));
    }

    // Narrow down based on duration
    const exerciseLimit = duration === '30 min' ? 4 : duration === '45 min' ? 6 : 8;
    const finalPlan = selectedExercises.slice(0, exerciseLimit);

    res.json({
        planName: `AI ${goal} Accelerator`,
        focus: focus,
        estimatedTime: duration,
        difficulty: experience,
        exercises: finalPlan,
        recommendation: `Drink at least 500ml of water during this ${duration} session.`
    });
});

module.exports = {
    generateWorkout
};
