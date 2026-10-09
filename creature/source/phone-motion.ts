import {subscribePhoneMotion as subscribe} from '../../character-phone-sensor.mjs';

export type PhoneMotionSample={gx:number;gy:number;shake:number;angularSpeed:number;timeSeconds:number};

/** Keep the sensor connection scoped to the customizer viewer's visible lifetime. */
export function subscribePhoneMotion(callback:(sample:PhoneMotionSample)=>void){
 return subscribe(callback);
}
