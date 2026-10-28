package com.skillconnect.service;

import com.skillconnect.domain.Booking;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Video meetings and calendar export.
 * Meeting links: replace {@link #createMeetingUrl} with Zoom (Meetings API), Microsoft Teams (Graph onlineMeetings)
 * or Google Meet (Calendar API conferenceData) adapters, selected by instructor preference.
 * Calendar: the .ics feed imports into Google Calendar and Outlook; two-way sync uses their OAuth APIs.
 */
@Service
public class MeetingService {

    private static final DateTimeFormatter ICS = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private final String videoBaseUrl;

    public MeetingService(@Value("${app.video.base-url:https://meet.jit.si}") String videoBaseUrl) {
        this.videoBaseUrl = videoBaseUrl;
    }

    public String createMeetingUrl(Booking booking) {
        return videoBaseUrl + "/skillconnect-" + UUID.randomUUID();
    }

    public String toIcs(Booking b) {
        String location = b.getMeetingUrl() != null ? b.getMeetingUrl()
                : b.getLocation() != null ? b.getLocation().getAddress() + ", " + b.getLocation().getCity() : "";
        return String.join("\r\n",
                "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SkillConnect//EN", "BEGIN:VEVENT",
                "UID:booking-" + b.getId() + "@skillconnect",
                "DTSTAMP:" + ICS.format(b.getCreatedAt()),
                "DTSTART:" + ICS.format(b.getStartAt()),
                "DTEND:" + ICS.format(b.getEndAt()),
                "SUMMARY:" + escape(b.getService().getName() + " with " + b.getInstructor().getUser().getFullName()),
                "LOCATION:" + escape(location),
                "END:VEVENT", "END:VCALENDAR", "");
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n");
    }
}
