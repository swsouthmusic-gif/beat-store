# Generated manually to update snippet_mp3 upload path to preview-snippet/

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beats', '0008_alter_beat_mp3_file_alter_beat_snippet_mp3_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='beat',
            name='snippet_mp3',
            field=models.FileField(blank=True, null=True, upload_to='preview-snippet/'),
        ),
    ]
