export const TONES=['gentle','direct','cheeky'];
export const CADENCES=[1,3,5,7];
export const DAYS={1:[1],3:[1,3,5],5:[1,2,3,4,5],7:[0,1,2,3,4,5,6]};
export const CADENCE_LABELS={1:'Once a week · Monday',3:'3 days a week · Mon, Wed, Fri',5:'Weekdays · Monday–Friday',7:'Every day'};
const messages={
 gentle:{workout:'A little movement, at your pace. MOM is here when you are ready.',meal:'Take a moment to log your meal. One small check-in is enough.',water:'A gentle nudge to take a water break.',motivation:'You do not have to do everything today. One small step counts.'},
 direct:{workout:'Time for your workout. Your coach is ready.',meal:'Pause and log your meal.',water:'Time for a water break.',motivation:'A small step counts. Move at your own pace.'},
 cheeky:{workout:'MOM has warmed up her encouragement. Your turn to move, darling.',meal:'Your meal has a story. MOM would like the short version. Log it, darling.',water:'Your water is waiting. Very patient. Unlike MOM.',motivation:'MOM believes in you. Embarrassingly much. Time for one small step.'}
};
export function reminderMessage(kind,tone='direct'){return messages[TONES.includes(tone)?tone:'direct'][kind]||messages.direct.motivation;}
export function scheduledDay(day,daysPerWeek=7){const weekday=new Date(day+'T12:00:00Z').getUTCDay();return (DAYS[daysPerWeek]||DAYS[7]).includes(weekday);}
