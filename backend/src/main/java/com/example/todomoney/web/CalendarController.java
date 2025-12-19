package com.example.todomoney.web;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.todomoney.entity.Task;
import com.example.todomoney.entity.TaskCompletionLog;
import com.example.todomoney.entity.TaskSchedule;
import com.example.todomoney.repo.TaskCompletionLogRepository;
import com.example.todomoney.repo.TaskScheduleRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    private final TaskScheduleRepository schedules;
    private final TaskCompletionLogRepository logs;

    public CalendarController(TaskScheduleRepository schedules, TaskCompletionLogRepository logs) {
        this.schedules = schedules;
        this.logs = logs;
    }

    public static class CalendarItem {
        public Long taskId;
        public String title;
        public String memo;
        public LocalDate date;
        public boolean completed;
        public List<TagDto> tags = new ArrayList<>();
    }

    public static class TagDto {
        public Long id;
        public String name;
        public String color;
        public TagDto(Long id, String name, String color) {
            this.id = id; this.name = name; this.color = color;
        }
    }

    private static int dowBit(DayOfWeek dow) {
        return switch (dow) {
            case SUNDAY -> 1;
            case MONDAY -> 2;
            case TUESDAY -> 4;
            case WEDNESDAY -> 8;
            case THURSDAY -> 16;
            case FRIDAY -> 32;
            case SATURDAY -> 64;
        };
    }

    @GetMapping
    public List<CalendarItem> get(
            @RequestParam String from,
            @RequestParam String to,
            HttpServletRequest req
    ) {
        Long userId = AuthUtil.requireUserId(req);

        LocalDate f = LocalDate.parse(from);
        LocalDate t = LocalDate.parse(to);

        // ★ Entity の List を取る（Repositoryじゃない）
        List<TaskSchedule> all = schedules.findByTask_UserId(userId);

        // 完了ログ（taskId@date）
        Set<String> done = new HashSet<>();
        for (TaskCompletionLog log : logs.findByUserIdAndOccurrenceDateBetweenOrderByCompletedAtDesc(userId, f, t)) {
            done.add(log.getTask().getId() + "@" + log.getOccurrenceDate());
        }

        List<CalendarItem> out = new ArrayList<>();
        LocalDate cur = f;

        while (!cur.isAfter(t)) {
            int bit = dowBit(cur.getDayOfWeek());

            for (TaskSchedule sch : all) {
                if (!matches(sch, cur, bit)) continue;

                Task task = sch.getTask();

                CalendarItem item = new CalendarItem();
                item.taskId = task.getId();
                item.title = task.getTitle();
                item.memo = task.getMemo();
                item.date = cur;
                item.completed = done.contains(task.getId() + "@" + cur);

                task.getTags().forEach(tag ->
                        item.tags.add(new TagDto(tag.getId(), tag.getName(), tag.getColor()))
                );

                out.add(item);
            }
            cur = cur.plusDays(1);
        }

        out.sort(Comparator
                .comparing((CalendarItem x) -> x.date)
                .thenComparing(x -> x.taskId));

        return out;
    }

    private boolean matches(TaskSchedule sch, LocalDate day, int dowBit) {
        if (sch.getType() == TaskSchedule.Type.DATE) {
            return sch.getDate() != null && sch.getDate().equals(day);
        }

        if (sch.getType() == TaskSchedule.Type.RANGE) {
            if (sch.getStartDate() == null || sch.getEndDate() == null) return false;
            return (!day.isBefore(sch.getStartDate()) && !day.isAfter(sch.getEndDate()));
        }

        if (sch.getType() == TaskSchedule.Type.WEEKLY) {
            if (sch.getStartDate() == null || sch.getEndDate() == null || sch.getDaysOfWeekMask() == null) return false;
            if (day.isBefore(sch.getStartDate()) || day.isAfter(sch.getEndDate())) return false;
            return (sch.getDaysOfWeekMask() & dowBit) != 0;
        }

        return false;
    }
}
