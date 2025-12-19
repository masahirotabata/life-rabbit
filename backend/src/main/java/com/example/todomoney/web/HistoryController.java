package com.example.todomoney.web;

import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.todomoney.entity.TaskCompletionLog;
import com.example.todomoney.repo.TaskCompletionLogRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final TaskCompletionLogRepository logs;

    public HistoryController(TaskCompletionLogRepository logs) {
        this.logs = logs;
    }

    @GetMapping
    public List<TaskCompletionLog> list(
            @RequestParam String from,
            @RequestParam String to,
            HttpServletRequest req
    ) {
        Long userId = AuthUtil.requireUserId(req);
        return logs.findByUserIdAndOccurrenceDateBetweenOrderByCompletedAtDesc(
                userId, LocalDate.parse(from), LocalDate.parse(to)
        );
    }
}
