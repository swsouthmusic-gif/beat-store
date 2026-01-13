# Generated manually for making cover_art optional

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beats', '0005_make_snippet_mp3_optional'),
    ]

    operations = [
        migrations.AlterField(
            model_name='beat',
            name='cover_art',
            field=models.ImageField(blank=True, null=True, upload_to='covers/'),
        ),
    ]
