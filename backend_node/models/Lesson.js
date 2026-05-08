const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correct_answer: { type: String, required: true },
    points: { type: Number, default: 10 }
});

const lessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    video_url: { type: String },
    content_type: { type: String, default: 'video' },
    sequence_order: { type: Number, required: true },
    tajweed_rule: { type: String, default: '' },   // Links to error_type from AI model
    quizzes: [quizSchema]
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
