import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  city: { type: String, trim: true, maxlength: 120, default: 'your area' },
  country: { type: String, trim: true, maxlength: 80, default: '' },
}, { _id: false });

const notificationSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true, trim: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  location: { type: locationSchema, required: true },
  timezone: { type: String, default: 'Asia/Kolkata', trim: true },
  dailyWeatherEnabled: { type: Boolean, default: true },
  heavyRainEnabled: { type: Boolean, default: true },
  severeWeatherEnabled: { type: Boolean, default: true },
  active: { type: Boolean, default: true, index: true },
  lastDailyLocalDate: { type: String, default: '' },
}, { timestamps: true, collection: 'notification_subscriptions' });

const NotificationSubscription = mongoose.models.NotificationSubscription
  || mongoose.model('NotificationSubscription', notificationSubscriptionSchema);

export default NotificationSubscription;