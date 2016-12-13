#!/usr/bin/env bash

echo
echo "Installing Java..."
apt-get install -y openjdk-8-jre icedtea-8-plugin
#cd /usr/local
#wget -nv -O jre-7u45-linux-x64.gz http://javadl.sun.com/webapps/download/AutoDL?BundleId=81812
#tar -xf jre-7u45-linux-x64.gz
#rm jre-7u45-linux-x64.gz
#ln -s /usr/local/jre1.7.0_45/bin/java /usr/bin/java

echo
echo "Installing Neo4j..."
cd /etc
wget -nv http://dist.neo4j.org/neo4j-community-3.0.7-unix.tar.gz
tar -xf neo4j-community-3.0.7-unix.tar.gz
rm neo4j-community-3.0.7-unix.tar.gz

echo
echo "Updating Neo4j Config..."
sed -i 's/#dbms\.security\.auth_enabled=false/dbms\.security\.auth_enabled=false/' /etc/neo4j-community-3.0.7/conf/neo4j.conf


sed -i 's/# dbms\.connector\.bolt\.address=0\.0\.0\.0\:7687/dbms\.connector\.bolt\.address=0\.0\.0\.0\:7687/' /etc/neo4j-community-3.0.7/conf/neo4j.conf
sed -i 's/#dbms\.connector\.http\.address=0\.0\.0\.0\:7474/dbms\.connector\.http\.address=0\.0\.0\.0\:7474/' /etc/neo4j-community-3.0.7/conf/neo4j.conf
sed -i 's/dbms\.connector\.https\.address=localhost\:7473/dbms\.connector\.https\.address=0\.0\.0\.0\:7473/' /etc/neo4j-community-3.0.7/conf/neo4j.conf

