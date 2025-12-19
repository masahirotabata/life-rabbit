package com.example.todomoney.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Tag {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long userId;
  private String name;
  private String color;

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getName() { return name; }
  public String getColor() { return color; }

  public void setUserId(Long userId) { this.userId = userId; }
  public void setName(String name) { this.name = name; }
  public void setColor(String color) { this.color = color; }
}
