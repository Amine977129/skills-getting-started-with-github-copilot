import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def test_activities(monkeypatch):
    activities = {
        "Chess Club": {
            "description": "Practice chess",
            "schedule": "Fridays",
            "max_participants": 12,
            "participants": [],
        }
    }
    monkeypatch.setattr(app_module, "activities", activities)
    return activities


@pytest.fixture
def client():
    return TestClient(app_module.app)


def test_root_redirects_to_frontend(client):
    # Arrange

    # Act
    response = client.get("/")

    # Assert
    assert response.history
    assert response.history[0].status_code == 307
    assert str(response.url).endswith("/static/index.html")


def test_get_activities_returns_activity_data(client, test_activities):
    # Arrange

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == test_activities


def test_signup_adds_participant(client, test_activities):
    # Arrange
    email = "student@example.com"

    # Act
    response = client.post("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert test_activities["Chess Club"]["participants"] == [email]


def test_signup_returns_404_for_unknown_activity(client, test_activities):
    # Arrange
    email = "student@example.com"

    # Act
    response = client.post("/activities/Unknown/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
    assert test_activities["Chess Club"]["participants"] == []


def test_signup_returns_409_for_duplicate_participant(client, test_activities):
    # Arrange
    email = "student@example.com"
    test_activities["Chess Club"]["participants"].append(email)

    # Act
    response = client.post("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"] == "Student is already signed up for this activity"
    assert test_activities["Chess Club"]["participants"] == [email]


def test_unregister_removes_participant(client, test_activities):
    # Arrange
    email = "student@example.com"
    test_activities["Chess Club"]["participants"].append(email)

    # Act
    response = client.delete("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Chess Club"}
    assert test_activities["Chess Club"]["participants"] == []


def test_unregister_returns_404_for_unknown_activity(client, test_activities):
    # Arrange
    email = "student@example.com"

    # Act
    response = client.delete("/activities/Unknown/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
    assert test_activities["Chess Club"]["participants"] == []


def test_unregister_returns_404_for_unregistered_participant(client, test_activities):
    # Arrange
    email = "student@example.com"

    # Act
    response = client.delete("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"
    assert test_activities["Chess Club"]["participants"] == []