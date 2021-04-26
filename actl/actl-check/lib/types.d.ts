export declare enum AnnotationLevel {
    Warning = "warning",
    Failure = "failure"
}
export declare enum Conclusion {
    Success = "success",
    Failure = "failure",
    Neutral = "neutral",
    Cancelled = "cancelled",
    TimedOut = "timed_out",
    ActionRequired = "action_required"
}
export interface Annotation {
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: AnnotationLevel;
    raw_details: string;
    title: string;
    message: string;
}
