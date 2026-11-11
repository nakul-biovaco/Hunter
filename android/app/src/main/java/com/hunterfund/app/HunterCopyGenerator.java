package com.hunterfund.app;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Single source of truth on native Android for personalized multi-language
 * notification text, speech script, and date-aware dynamic savings calculations.
 * Ensures hourly reminders stay accurate across midnight even when the app is closed.
 */
public final class HunterCopyGenerator {

    private static final String PREFS_NAME = "hunter_native_reminder_state";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_QUIET_ENABLED = "quietHoursEnabled";
    private static final String KEY_QUIET_START = "quietStartHour";
    private static final String KEY_QUIET_END = "quietEndHour";
    private static final String KEY_VOICE_LANG = "voiceLanguage";
    private static final String KEY_TARGET_AMOUNT = "targetAmount";
    private static final String KEY_CURRENT_BALANCE = "currentBalance";
    private static final String KEY_REMAINING_AMOUNT = "remainingAmount";
    private static final String KEY_TARGET_DATE = "targetDate";
    private static final String KEY_SYNCED_DATE = "syncedDate";
    private static final String KEY_TODAY_ACTUAL = "todayActualSavings";
    private static final String KEY_TODAY_PLANNED = "todayPlannedSavings";
    private static final String KEY_DAYS_REMAINING = "daysRemaining";
    private static final String KEY_BIKE_MODEL = "bikeModel";
    private static final String KEY_NEXT_ALARM_AT = "nextAlarmAtMillis";

    private HunterCopyGenerator() {}

    public static final class HunterState {
        public boolean enabled = true;
        public boolean quietHoursEnabled = true;
        public int quietStartHour = 23;
        public int quietEndHour = 8;
        public String voiceLanguage = "hinglish";
        public double targetAmount = 130000;
        public double currentBalance = 52000;
        public double remainingAmount = 78000;
        public String targetDate = "2027-01-10";
        public String syncedDate = "";
        public double todayActualSavings = 0;
        public double todayPlannedSavings = 1280;
        public long daysRemaining = 61;
        public String bikeModel = "Royal Enfield Hunter 350";
        public long nextAlarmAtMillis = 0;
    }

    public static final class LiveCopy {
        public String title;
        public String body;
        public String speechText;
        public String ttsLang;
        public long needed;
        public long planned;
        public long actual;
        public long remaining;
        public long days;
    }

    public static void saveState(Context context, HunterState state) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_ENABLED, state.enabled)
            .putBoolean(KEY_QUIET_ENABLED, state.quietHoursEnabled)
            .putInt(KEY_QUIET_START, state.quietStartHour)
            .putInt(KEY_QUIET_END, state.quietEndHour)
            .putString(KEY_VOICE_LANG, state.voiceLanguage != null ? state.voiceLanguage : "hinglish")
            .putFloat(KEY_TARGET_AMOUNT, (float) state.targetAmount)
            .putFloat(KEY_CURRENT_BALANCE, (float) state.currentBalance)
            .putFloat(KEY_REMAINING_AMOUNT, (float) state.remainingAmount)
            .putString(KEY_TARGET_DATE, state.targetDate != null ? state.targetDate : "2027-01-10")
            .putString(KEY_SYNCED_DATE, state.syncedDate != null ? state.syncedDate : getTodayDateString())
            .putFloat(KEY_TODAY_ACTUAL, (float) state.todayActualSavings)
            .putFloat(KEY_TODAY_PLANNED, (float) state.todayPlannedSavings)
            .putLong(KEY_DAYS_REMAINING, state.daysRemaining)
            .putString(KEY_BIKE_MODEL, state.bikeModel != null ? state.bikeModel : "Royal Enfield Hunter 350")
            .apply();
    }

    public static HunterState loadState(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        HunterState s = new HunterState();
        s.enabled = prefs.getBoolean(KEY_ENABLED, true);
        s.quietHoursEnabled = prefs.getBoolean(KEY_QUIET_ENABLED, true);
        s.quietStartHour = prefs.getInt(KEY_QUIET_START, 23);
        s.quietEndHour = prefs.getInt(KEY_QUIET_END, 8);
        s.voiceLanguage = prefs.getString(KEY_VOICE_LANG, "hinglish");
        s.targetAmount = prefs.getFloat(KEY_TARGET_AMOUNT, 130000f);
        s.currentBalance = prefs.getFloat(KEY_CURRENT_BALANCE, 52000f);
        s.remainingAmount = prefs.getFloat(KEY_REMAINING_AMOUNT, 78000f);
        s.targetDate = prefs.getString(KEY_TARGET_DATE, "2027-01-10");
        s.syncedDate = prefs.getString(KEY_SYNCED_DATE, getTodayDateString());
        s.todayActualSavings = prefs.getFloat(KEY_TODAY_ACTUAL, 0f);
        s.todayPlannedSavings = prefs.getFloat(KEY_TODAY_PLANNED, 1280f);
        s.daysRemaining = prefs.getLong(KEY_DAYS_REMAINING, 61L);
        s.bikeModel = prefs.getString(KEY_BIKE_MODEL, "Royal Enfield Hunter 350");
        s.nextAlarmAtMillis = prefs.getLong(KEY_NEXT_ALARM_AT, 0L);
        return s;
    }

    public static void saveNextAlarmAt(Context context, long triggerMillis) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putLong(KEY_NEXT_ALARM_AT, triggerMillis).apply();
    }

    public static long getNextAlarmAt(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getLong(KEY_NEXT_ALARM_AT, 0L);
    }

    public static String getTodayDateString() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return sdf.format(new Date());
    }

    public static long computeCalendarDaysBetween(String fromDateStr, String toDateStr) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        sdf.setLenient(false);
        try {
            Date from = sdf.parse(fromDateStr);
            Date to = sdf.parse(toDateStr);
            if (from == null || to == null) return 0;

            Calendar c1 = Calendar.getInstance();
            c1.setTime(from);
            c1.set(Calendar.HOUR_OF_DAY, 0);
            c1.set(Calendar.MINUTE, 0);
            c1.set(Calendar.SECOND, 0);
            c1.set(Calendar.MILLISECOND, 0);

            Calendar c2 = Calendar.getInstance();
            c2.setTime(to);
            c2.set(Calendar.HOUR_OF_DAY, 0);
            c2.set(Calendar.MINUTE, 0);
            c2.set(Calendar.SECOND, 0);
            c2.set(Calendar.MILLISECOND, 0);

            long diffMs = c2.getTimeInMillis() - c1.getTimeInMillis();
            return Math.max(0L, Math.round(diffMs / (1000.0 * 60.0 * 60.0 * 24.0)));
        } catch (ParseException e) {
            return 0;
        }
    }

    /**
     * Computes live daily metrics, handling midnight date rollovers cleanly even when
     * the app has not been opened for multiple days.
     */
    public static LiveCopy computeLiveCopy(HunterState state, boolean isTestFallback) {
        String todayStr = getTodayDateString();
        boolean isSameDay = todayStr.equals(state.syncedDate);

        long remaining = Math.max(0L, Math.round(state.remainingAmount));
        long actual;
        long planned;
        long days;

        if (isSameDay) {
            actual = Math.max(0L, Math.round(state.todayActualSavings));
            planned = Math.max(0L, Math.round(state.todayPlannedSavings));
            days = Math.max(0L, state.daysRemaining);
        } else {
            // New day started while app was killed in background -> reset today's saved to 0
            // and recompute daysRemaining & daily planned amount from remaining target.
            actual = 0L;
            days = computeCalendarDaysBetween(todayStr, state.targetDate);
            if (remaining <= 0L) {
                planned = 0L;
            } else if (days > 0L) {
                planned = (long) Math.ceil(remaining / (double) days);
            } else {
                planned = remaining;
            }
        }

        long needed = Math.max(0L, planned - actual);
        if (isTestFallback && needed == 0L && planned > 0L) {
            needed = planned;
        }

        return buildCopy(state.voiceLanguage, needed, planned, actual, remaining, days);
    }

    public static LiveCopy buildCopy(
        String voiceLanguage,
        long needed,
        long planned,
        long actual,
        long remaining,
        long days
    ) {
        String lang = voiceLanguage != null ? voiceLanguage.toLowerCase(Locale.US) : "hinglish";
        LiveCopy copy = new LiveCopy();
        copy.needed = needed;
        copy.planned = planned;
        copy.actual = actual;
        copy.remaining = remaining;
        copy.days = days;

        String neededStr = formatIndianNumber(needed);
        String plannedStr = formatIndianNumber(planned);
        String actualStr = formatIndianNumber(actual);
        String remainingStr = formatIndianNumber(remaining);

        switch (lang) {
            case "hindi":
                copy.ttsLang = "hi-IN";
                if (remaining <= 0) {
                    copy.title = "बधाई हो लीना जी! हंटर 350 लक्ष्य पूरा हो गया";
                    copy.body = "नमस्ते लीना मूंधड़ा जी! आपने ₹" + plannedStr + " का पूरा बचत लक्ष्य हासिल कर लिया है।";
                    copy.speechText = "बधाई हो लीना मूंधड़ा जी! आपकी रॉयल एनफील्ड हंटर 350 का पूरा बचत लक्ष्य पूरा हो चुका है।";
                } else if (actual > 0) {
                    copy.title = "लीना जी, ₹" + neededStr + " आज और जमा करें — हंटर 350";
                    copy.body = "नमस्ते लीना मूंधड़ा जी! आज ₹" + actualStr + " जमा किए हैं, लक्ष्य ₹" + plannedStr + " है। कुल ₹" + remainingStr + " बाकी हैं (" + days + " दिन शेष)।";
                    copy.speechText = "नमस्ते लीना मूंधड़ा जी! हंटर फंड रिमाइंडर। आज आपने " + actual + " रुपये जमा किए हैं। आज का लक्ष्य पूरा करने के लिए " + needed + " रुपये और जमा करें। आपकी हंटर 350 के लिए कुल " + remaining + " रुपये बाकी हैं।";
                } else {
                    copy.title = "लीना जी, आज ₹" + neededStr + " जमा करें — हंटर 350";
                    copy.body = "नमस्ते लीना मूंधड़ा जी! आज का बचत लक्ष्य ₹" + plannedStr + " है। हंटर 350 के लिए कुल ₹" + remainingStr + " शेष हैं (" + days + " दिन शेष)। अपनी बचत दर्ज करें!";
                    copy.speechText = "नमस्ते लीना मूंधड़ा जी! हंटर फंड रिमाइंडर। आज का बचत लक्ष्य " + planned + " रुपये है। अभी शून्य रुपये जमा हुए हैं। आपकी हंटर 350 के लिए कुल " + remaining + " रुपये बाकी हैं। कृपया अपनी बचत दर्ज करें।";
                }
                break;

            case "marathi":
                copy.ttsLang = "mr-IN";
                if (remaining <= 0) {
                    copy.title = "अभिनंदन लीना ताई! हंटर 350 उद्दिष्ट पूर्ण झाले";
                    copy.body = "नमस्कार लीना मुंढडा ताई! आपले हंटर 350 साठीचे संपूर्ण बचत उद्दिष्ट पूर्ण झाले आहे.";
                    copy.speechText = "अभिनंदन लीना मुंढडा ताई! आपल्या रॉयल एनफील्ड हंटर 350 चे संपूर्ण बचत उद्दिष्ट पूर्ण झाले आहे.";
                } else if (actual > 0) {
                    copy.title = "लीना ताई, ₹" + neededStr + " आज जमा करायचे बाकी — हंटर 350";
                    copy.body = "नमस्कार लीना मुंढडा ताई! आज ₹" + actualStr + " जमा केले, उद्दिष्ट ₹" + plannedStr + " आहे. एकूण ₹" + remainingStr + " शिल्लक आहेत (" + days + " दिवस उरले).";
                    copy.speechText = "नमस्कार लीना मुंढडा ताई! हंटर फंड रिमाइंडर. आज आपण " + actual + " रुपये जमा केले आहेत. आजचे उद्दिष्ट गाठण्यासाठी " + needed + " रुपये जमा करायचे बाकी आहेत. आपल्या हंटर 350 साठी एकूण " + remaining + " रुपये शिल्लक आहेत.";
                } else {
                    copy.title = "लीना ताई, आज ₹" + neededStr + " जमा करा — हंटर 350";
                    copy.body = "नमस्कार लीना मुंढडा ताई! आजचे बचतीचे उद्दिष्ट ₹" + plannedStr + " आहे. हंटर 350 साठी एकूण ₹" + remainingStr + " शिल्लक आहेत (" + days + " दिवस उरले). आजची बचत नोंदवा!";
                    copy.speechText = "नमस्कार लीना मुंढडा ताई! हंटर फंड रिमाइंडर. आजचे बचतीचे उद्दिष्ट " + planned + " रुपये आहे. आपल्या हंटर 350 साठी एकूण " + remaining + " रुपये शिल्लक आहेत. कृपया आजची बचत नोंदवा.";
                }
                break;

            case "english":
                copy.ttsLang = "en-IN";
                if (remaining <= 0) {
                    copy.title = "Congratulations Leena! Hunter 350 Goal Achieved";
                    copy.body = "Hello Leena Mundhada! Your complete savings goal for Royal Enfield Hunter 350 is ready!";
                    copy.speechText = "Congratulations Leena Mundhada! You have achieved your complete savings goal for the Royal Enfield Hunter 350.";
                } else if (actual > 0) {
                    copy.title = "Leena, ₹" + neededStr + " More Needed Today — Hunter 350";
                    copy.body = "Hello Leena Mundhada! You saved ₹" + actualStr + " of ₹" + plannedStr + " today. ₹" + remainingStr + " left for Hunter 350 (" + days + "d left to 10 Jan 2027).";
                    copy.speechText = "Hello Leena Mundhada! Hunter Fund alert. You have saved " + actual + " rupees today. You need " + needed + " more rupees to hit your daily goal of " + planned + " rupees. Total remaining for your Hunter 350 is " + remaining + " rupees.";
                } else {
                    copy.title = "Leena, ₹" + neededStr + " Deposit Required Today — Hunter 350";
                    copy.body = "Hello Leena Mundhada! Today's target: ₹" + plannedStr + " (Saved: ₹0) • ₹" + remainingStr + " balance remaining (" + days + "d left). Tap to record deposit!";
                    copy.speechText = "Hello Leena Mundhada! Hunter Fund alert. Today's required deposit is " + planned + " rupees. Zero rupees saved today. Total remaining for your Hunter 350 is " + remaining + " rupees. Record your deposit now.";
                }
                break;

            case "hinglish":
            default:
                copy.ttsLang = "hi-IN";
                if (remaining <= 0) {
                    copy.title = "बधाई हो लीना जी! Hunter 350 Target Complete";
                    copy.body = "Hello Leena Mundhada ji! Aapne Hunter 350 ka poora savings goal complete kar liya hai!";
                    copy.speechText = "बधाई हो लीना मूंधड़ा जी! आपने अपनी हंटर 350 का पूरा बचत लक्ष्य पूरा कर लिया है।";
                } else if (actual > 0) {
                    copy.title = "लीना जी, ₹" + neededStr + " आज जमा करना बाकी है — Hunter 350";
                    copy.body = "Hello Leena Mundhada ji! Aaj ₹" + actualStr + " save hua hai (Target: ₹" + plannedStr + "). Total ₹" + remainingStr + " bache hain (" + days + " din bache). Tap karke deposit karein!";
                    copy.speechText = "हेलो लीना मूंधड़ा जी! हंटर फंड अलर्ट। आज आपने " + actual + " रुपये जमा किए हैं। आज का लक्ष्य पूरा करने के लिए " + needed + " रुपये और जमा करें। हंटर 350 के लिए कुल " + remaining + " रुपये बाकी हैं।";
                } else {
                    copy.title = "लीना जी, ₹" + neededStr + " आज जमा करना है — Hunter 350";
                    copy.body = "Hello Leena Mundhada ji! Aaj ka savings target ₹" + plannedStr + " hai. Hunter 350 ke liye kul ₹" + remainingStr + " bache hain (" + days + " din bache). Jaldi se apna deposit record karein!";
                    copy.speechText = "हेलो लीना मूंधड़ा जी! हंटर फंड अलर्ट। आज का बचत लक्ष्य " + planned + " रुपये है। हंटर 350 के लिए कुल " + remaining + " रुपये बाकी हैं। जल्दी से अपनी आज की बचत दर्ज करें।";
                }
                break;
        }
        return copy;
    }

    public static String formatIndianNumber(long value) {
        if (value == 0L) return "0";
        boolean neg = value < 0;
        String s = Long.toString(Math.abs(value));
        if (s.length() <= 3) return (neg ? "-" : "") + s;
        String lastThree = s.substring(s.length() - 3);
        String rest = s.substring(0, s.length() - 3);
        StringBuilder sb = new StringBuilder();
        while (rest.length() > 2) {
            sb.insert(0, "," + rest.substring(rest.length() - 2));
            rest = rest.substring(0, rest.length() - 2);
        }
        sb.insert(0, rest);
        sb.append(",").append(lastThree);
        return (neg ? "-" : "") + sb;
    }

    public static boolean isInQuietHours(HunterState state, Calendar cal) {
        if (!state.quietHoursEnabled) return false;
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        if (state.quietStartHour > state.quietEndHour) {
            return hour >= state.quietStartHour || hour < state.quietEndHour;
        }
        return hour >= state.quietStartHour && hour < state.quietEndHour;
    }
}

