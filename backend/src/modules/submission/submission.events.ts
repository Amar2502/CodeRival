import EventEmitter from "events";

export const submissionEvents = new EventEmitter();
submissionEvents.setMaxListeners(500);
