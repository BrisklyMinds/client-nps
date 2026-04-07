from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_alter_feedback_feedback_type_alter_feedback_phone"),
    ]

    operations = [
        migrations.AddField(
            model_name="system",
            name="name_ky",
            field=models.CharField(blank=True, default="", max_length=255, verbose_name="name (Kyrgyz)"),
        ),
        migrations.AddField(
            model_name="system",
            name="name_en",
            field=models.CharField(blank=True, default="", max_length=255, verbose_name="name (English)"),
        ),
    ]
