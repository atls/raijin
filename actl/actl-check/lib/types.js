"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conclusion = exports.AnnotationLevel = void 0;
var AnnotationLevel;
(function (AnnotationLevel) {
    AnnotationLevel["Warning"] = "warning";
    AnnotationLevel["Failure"] = "failure";
})(AnnotationLevel = exports.AnnotationLevel || (exports.AnnotationLevel = {}));
var Conclusion;
(function (Conclusion) {
    Conclusion["Success"] = "success";
    Conclusion["Failure"] = "failure";
    Conclusion["Neutral"] = "neutral";
    Conclusion["Cancelled"] = "cancelled";
    Conclusion["TimedOut"] = "timed_out";
    Conclusion["ActionRequired"] = "action_required";
})(Conclusion = exports.Conclusion || (exports.Conclusion = {}));
