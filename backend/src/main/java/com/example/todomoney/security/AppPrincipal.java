package com.example.todomoney.security;

import java.security.Principal;

public record AppPrincipal(long userId, String email) implements Principal {
  @Override
  public String getName() {
    return email;
  }
}
