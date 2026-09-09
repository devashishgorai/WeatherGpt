import mongoose from 'mongoose';

const weatherAlertHistorySchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationSubscription', required: true, index: true },
  eventId: { type: String, required: true },
  kind: { type: String, enum: ['heavy-rain', 'severe-weather'], required: true },
  sentAt: { type: Date, required: true, default: Date.now },
  severityAmountMm: { type: Number, default: 0 },
  locationKey: { type: String, required: true },
  eventEnd: { type: Date, default: null },
}, { timestamps: true, collection: 'weather_alert_history' });

weatherAlertHistorySchema.index({ subscriptionId: 1, eventId: 1, kind: 1 });

const WeatherAlertHistory = mongoose.models.WeatherAlertHistory
  || mongoose.model('WeatherAlertHistory', weatherAlertHistorySchema);

export default WeatherAlertHistory;