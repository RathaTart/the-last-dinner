// Metres per second and metres between individual footfalls, shared by
// navigation, live movement sounds and the audio preview without scene imports.
export const MOVEMENT_PROFILES=Object.freeze({
 walk:Object.freeze({speed:1.8,stride:.72}),
 run:Object.freeze({speed:3.8,stride:.86}),
 crouch:Object.freeze({speed:.9,stride:.5})
});
export function stepInterval(mode='walk'){
 const profile=Object.hasOwn(MOVEMENT_PROFILES,mode)?MOVEMENT_PROFILES[mode]:MOVEMENT_PROFILES.walk;
 return profile.stride/profile.speed;
}
