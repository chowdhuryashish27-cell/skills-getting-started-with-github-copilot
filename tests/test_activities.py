from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


def reset_activity_state():
    activities["Chess Club"]["participants"] = ["michael@mergington.edu", "daniel@mergington.edu"]
    activities["Programming Class"]["participants"] = ["emma@mergington.edu", "sophia@mergington.edu"]


def test_get_activities_returns_activity_data():
    # Arrange
    reset_activity_state()

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert "Chess Club" in response.json()
    assert response.json()["Chess Club"]["description"] == "Learn strategies and compete in chess tournaments"


def test_signup_adds_student_to_activity():
    # Arrange
    reset_activity_state()
    email = "newstudent@mergington.edu"

    # Act
    response = client.post(f"/activities/Chess Club/signup?email={email}")

    # Assert
    assert response.status_code == 200
    assert email in activities["Chess Club"]["participants"]
    assert response.json()["message"] == f"Signed up {email} for Chess Club"


def test_signup_rejects_duplicate_email():
    # Arrange
    reset_activity_state()
    email = "michael@mergington.edu"

    # Act
    response = client.post(f"/activities/Chess Club/signup?email={email}")

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up for this activity"


def test_signup_returns_404_for_missing_activity():
    # Arrange
    reset_activity_state()
    email = "newstudent@mergington.edu"

    # Act
    response = client.post(f"/activities/Unknown Club/signup?email={email}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_removes_student_from_activity():
    # Arrange
    reset_activity_state()
    email = "michael@mergington.edu"

    # Act
    response = client.delete(f"/activities/Chess Club/unregister?email={email}")

    # Assert
    assert response.status_code == 200
    assert email not in activities["Chess Club"]["participants"]
    assert response.json()["message"] == f"Unregistered {email} from Chess Club"


def test_unregister_rejects_missing_student():
    # Arrange
    reset_activity_state()
    email = "notregistered@mergington.edu"

    # Act
    response = client.delete(f"/activities/Chess Club/unregister?email={email}")

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is not signed up for this activity"
