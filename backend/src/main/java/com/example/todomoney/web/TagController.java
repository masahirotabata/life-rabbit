package com.example.todomoney.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todomoney.entity.Tag;
import com.example.todomoney.repo.TagRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagRepository tags;

    public TagController(TagRepository tags) {
        this.tags = tags;
    }

    @GetMapping
    public List<Tag> list(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        return tags.findByUserIdOrderByNameAsc(userId);
    }

    public static class CreateTagReq {
        public String name;
        public String color;
    }

    @PostMapping
    public Tag create(@RequestBody CreateTagReq body, HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);

        Tag t = new Tag();
        t.setUserId(userId);
        t.setName(body.name);
        t.setColor(body.color);
        return tags.save(t);
    }
}
