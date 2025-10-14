from django import template

register = template.Library()

@register.filter
def length_is(value, arg):
    """
    Template filter to check if the length of a value equals the given argument.
    This replaces the removed length_is filter from Django 4.0+
    """
    try:
        return len(value) == int(arg)
    except (ValueError, TypeError):
        return False
